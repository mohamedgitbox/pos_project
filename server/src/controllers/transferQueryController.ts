import { Request, Response } from "express";
import mongoose, { type FilterQuery } from "mongoose";
import { z } from "zod";
import { Branch, Inventory, StockTransfer, TransferItem, type IStockTransfer } from "../models";
import {
  branchInfo,
  fail,
  productInfo,
  serializeTransferDetail,
  serializeTransferSummary,
  type TransferDoc,
  type TransferItemDoc,
} from "../utils/transferSerializers";

const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"]).optional(),
});

interface InventoryStockDoc {
  productId: unknown;
  quantity?: unknown;
  minLevel?: unknown;
}

function canAccessTransfer(req: Request, fromBranchId: string, toBranchId: string): boolean {
  if (!req.user) return false;
  if (req.user.role === "ADMIN") return true;
  const userBranchId = req.user.branchId ? String(req.user.branchId) : null;
  return !!userBranchId && (userBranchId === fromBranchId || userBranchId === toBranchId);
}

export async function listTransfers(req: Request, res: Response): Promise<Response> {
  try {
    const query = listQuerySchema.parse(req.query);
    const filter: FilterQuery<IStockTransfer> = {};
    if (query.status) filter.status = query.status;

    if (req.user?.role !== "ADMIN") {
      const userBranchId = req.user?.branchId ? String(req.user.branchId) : null;
      if (!userBranchId) {
        return res.json({ success: true, data: [] });
      }
      const branchObjectId = new mongoose.Types.ObjectId(userBranchId);
      filter.$or = [{ fromBranchId: branchObjectId }, { toBranchId: branchObjectId }];
    }

    const transfers = (await StockTransfer.find(filter)
      .sort({ createdAt: -1 })
      .populate("fromBranchId", "name")
      .populate("toBranchId", "name")
      .populate("initiatedBy", "name email")
      .lean()) as unknown as TransferDoc[];

    return res.json({ success: true, data: transfers.map(serializeTransferSummary) });
  } catch (error) {
    return fail(res, error, "Failed to load transfers");
  }
}

export async function getBranchStock(req: Request, res: Response): Promise<Response> {
  try {
    const { branchId } = z.object({ branchId: idSchema }).parse(req.params);
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (req.user.role !== "ADMIN" && String(req.user.branchId ?? "") !== branchId) {
      return res.status(403).json({ success: false, error: "You can only view stock for your assigned branch" });
    }
    if (!(await Branch.exists({ _id: branchId }))) {
      return res.status(404).json({ success: false, error: "Branch not found" });
    }

    const inventories = (await Inventory.find({ branchId: new mongoose.Types.ObjectId(branchId) })
      .populate("productId", "name SKU barcode")
      .sort({ quantity: -1, createdAt: -1 })
      .lean()) as unknown as InventoryStockDoc[];

    return res.json({
      success: true,
      data: inventories.map((inventory) => {
        const product = productInfo(inventory.productId);
        return {
          productId: product.id,
          name: product.name,
          SKU: product.SKU,
          barcode: product.barcode,
          quantity: Number(inventory.quantity ?? 0),
          minLevel: Number(inventory.minLevel ?? 0),
        };
      }),
    });
  } catch (error) {
    return fail(res, error, "Failed to load branch stock");
  }
}

export async function getTransfer(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);
    const transfer = (await StockTransfer.findById(id)
      .populate("fromBranchId", "name")
      .populate("toBranchId", "name")
      .populate("initiatedBy", "name email")
      .populate("shippedBy", "name email")
      .populate("receivedBy", "name email")
      .populate("cancelledBy", "name email")
      .lean()) as unknown as TransferDoc | null;

    if (!transfer) {
      return res.status(404).json({ success: false, error: "Transfer not found" });
    }

    const fromBranch = branchInfo(transfer.fromBranchId);
    const toBranch = branchInfo(transfer.toBranchId);
    if (!canAccessTransfer(req, fromBranch.id, toBranch.id)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const items = (await TransferItem.find({ transferId: id })
      .populate("productId", "name SKU barcode")
      .lean()) as unknown as TransferItemDoc[];

    return res.json({ success: true, data: serializeTransferDetail(transfer, items) });
  } catch (error) {
    return fail(res, error, "Failed to load transfer");
  }
}