import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AuditLog, StockTransfer, TransferItem } from "../models";
import { decrementStock, incrementStock } from "../services/inventoryService";
import { fail, type TransferDoc, type TransferItemDoc } from "../utils/transferSerializers";

const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const statusSchema = z.object({
  status: z.enum(["SHIP", "RECEIVE", "CANCEL"]),
});

export async function updateTransferStatus(req: Request, res: Response): Promise<Response> {
  const session = await mongoose.startSession();

  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);
    const data = statusSchema.parse(req.body);
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const actorId = new mongoose.Types.ObjectId(String(req.user._id));
    const actorRole = req.user.role;
    const actorBranchId = req.user.branchId ? String(req.user.branchId) : null;
    let transferNo = "";
    let newStatus = "";

    await session.withTransaction(async () => {
      const current = (await StockTransfer.findById(id).session(session).lean()) as unknown as TransferDoc | null;
      if (!current) throw new Error("NOT_FOUND");

      transferNo = current.transferNo;
      const fromBranchId = String(current.fromBranchId);
      const toBranchId = String(current.toBranchId);

      if (data.status === "SHIP") {
        if (actorRole !== "ADMIN" && actorBranchId !== fromBranchId) throw new Error("FORBIDDEN");
        if (current.status !== "PENDING") throw new Error("INVALID_TRANSITION");

        const items = (await TransferItem.find({ transferId: id }).session(session).lean()) as unknown as TransferItemDoc[];
        for (const item of items) {
          await decrementStock(
            new mongoose.Types.ObjectId(String(item.productId)),
            new mongoose.Types.ObjectId(fromBranchId),
            Number(item.quantity),
            session
          );
        }

        const updated = await StockTransfer.findOneAndUpdate(
          { _id: id, status: "PENDING" as const },
          { $set: { status: "IN_TRANSIT" as const, shippedBy: actorId, shippedAt: new Date() } },
          { session, new: true }
        );
        if (!updated) throw new Error("INVALID_TRANSITION");
        newStatus = "IN_TRANSIT";
      } else if (data.status === "RECEIVE") {
        if (actorRole !== "ADMIN" && actorBranchId !== toBranchId) throw new Error("FORBIDDEN");
        if (current.status !== "IN_TRANSIT") throw new Error("INVALID_TRANSITION");

        const items = (await TransferItem.find({ transferId: id }).session(session).lean()) as unknown as TransferItemDoc[];
        for (const item of items) {
          await incrementStock(
            new mongoose.Types.ObjectId(String(item.productId)),
            new mongoose.Types.ObjectId(toBranchId),
            Number(item.quantity),
            session
          );
        }

        const updated = await StockTransfer.findOneAndUpdate(
          { _id: id, status: "IN_TRANSIT" as const },
          { $set: { status: "RECEIVED" as const, receivedBy: actorId, receivedAt: new Date() } },
          { session, new: true }
        );
        if (!updated) throw new Error("INVALID_TRANSITION");
        newStatus = "RECEIVED";
      } else {
        if (actorRole !== "ADMIN" && actorBranchId !== fromBranchId) throw new Error("FORBIDDEN");
        if (current.status !== "PENDING") throw new Error("INVALID_TRANSITION");

        const updated = await StockTransfer.findOneAndUpdate(
          { _id: id, status: "PENDING" as const },
          { $set: { status: "CANCELLED" as const, cancelledBy: actorId, cancelledAt: new Date() } },
          { session, new: true }
        );
        if (!updated) throw new Error("INVALID_TRANSITION");
        newStatus = "CANCELLED";
      }

      const userAgentHeader = req.headers["user-agent"];
      const action =
        data.status === "SHIP" ? "TRANSFER_SHIP" : data.status === "RECEIVE" ? "TRANSFER_RECEIVE" : "TRANSFER_CANCELLED";

      await new AuditLog({
        userId: actorId,
        action,
        entityType: "StockTransfer",
        entityId: new mongoose.Types.ObjectId(id),
        after: { transferNo, status: newStatus },
        ipAddress: req.ip,
        userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
        timestamp: new Date(),
      }).save({ session });
    });

    return res.json({ success: true, data: { _id: id, transferNo, status: newStatus } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") return res.status(404).json({ success: false, error: "Transfer not found" });
      if (error.message === "FORBIDDEN") return res.status(403).json({ success: false, error: "Forbidden" });
      if (error.message === "INVALID_TRANSITION") {
        return res.status(400).json({ success: false, error: "Invalid transfer status transition" });
      }
    }
    return fail(res, error, "Failed to update transfer status");
  } finally {
    await session.endSession();
  }
}