import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AuditLog, Branch, Inventory, Product, StockTransfer, TransferItem } from "../models";
import { getNextSequence } from "../services/counterService";
import { branchInfo, fail } from "../utils/transferSerializers";

const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const createSchema = z.object({
  fromBranchId: idSchema,
  toBranchId: idSchema,
  note: z.string().trim().max(500).optional(),
  items: z.array(z.object({ productId: idSchema, quantity: z.number().int().positive() })).min(1, "At least one item is required"),
});

interface ProductRow { _id: unknown; name?: unknown; SKU?: unknown; }
interface InventoryRow { productId: unknown; quantity?: unknown; }
interface Shortfall { productId: string; name: string; SKU: string; available: number; requested: number; }
interface ResponseData { _id: string; transferNo: string; fromBranch: { id: string; name: string }; toBranch: { id: string; name: string }; initiatedBy: { id: string; name: string }; status: string; note: string; totalQuantity: number; items: Array<{ productId: string; name: string; SKU: string; quantity: number }>; createdAt: string; }

export async function createTransfer(req: Request, res: Response): Promise<Response> {
  const session = await mongoose.startSession();
  try {
    const data = createSchema.parse(req.body);
    if (!req.user) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (data.fromBranchId === data.toBranchId) return res.status(400).json({ success: false, error: "Source and destination branches must be different" });
    if (req.user.role !== "ADMIN" && String(req.user.branchId ?? "") !== data.fromBranchId) return res.status(403).json({ success: false, error: "You can only transfer stock from your assigned branch" });

    const productIds = data.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) return res.status(400).json({ success: false, error: "Duplicate products are not allowed in one transfer" });

    const fromBranchDoc = await Branch.findById(data.fromBranchId).select("name").lean();
    const toBranchDoc = await Branch.findById(data.toBranchId).select("name").lean();
    if (!fromBranchDoc || !toBranchDoc) return res.status(404).json({ success: false, error: "Branch not found" });

    const productObjectIds = productIds.map((id) => new mongoose.Types.ObjectId(id));
    const products = (await Product.find({ _id: { $in: productObjectIds } }).select("_id name SKU").lean()) as unknown as ProductRow[];
    if (products.length !== productIds.length) return res.status(400).json({ success: false, error: "One or more products were not found" });

    const productMap = new Map(products.map((p) => [String(p._id), p] as [string, ProductRow]));
    const inventories = (await Inventory.find({ branchId: new mongoose.Types.ObjectId(data.fromBranchId), productId: { $in: productObjectIds } }).lean()) as unknown as InventoryRow[];
    const stockMap = new Map(inventories.map((inv) => [String(inv.productId), Number(inv.quantity ?? 0)] as [string, number]));

    const insufficient: Shortfall[] = [];
    for (const item of data.items) {
      const available = stockMap.get(item.productId) ?? 0;
      if (available < item.quantity) {
        const product = productMap.get(item.productId);
        insufficient.push({ productId: item.productId, name: String(product?.name ?? "Unknown"), SKU: String(product?.SKU ?? ""), available, requested: item.quantity });
      }
    }
    if (insufficient.length > 0) return res.status(409).json({ success: false, error: "Insufficient stock at source branch", details: insufficient });
    const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
    const userObjectId = new mongoose.Types.ObjectId(String(req.user._id));
    const actorName = String(req.user.name || (req.user as { email?: string }).email || "");
    const fromBranchObjectId = new mongoose.Types.ObjectId(data.fromBranchId);
    const toBranchObjectId = new mongoose.Types.ObjectId(data.toBranchId);
    const fromBranch = branchInfo(fromBranchDoc);
    const toBranch = branchInfo(toBranchDoc);
    let responseData: ResponseData | undefined;

    await session.withTransaction(async () => {
      const transferNo = await getNextSequence("transferNo", session);
      const transfer = new StockTransfer({
        transferNo,
        fromBranchId: fromBranchObjectId,
        toBranchId: toBranchObjectId,
        initiatedBy: userObjectId,
        status: "PENDING" as const,
        note: data.note,
        totalQuantity,
        timestamp: new Date(),
      });
      await transfer.save({ session });

      await TransferItem.insertMany(
        data.items.map((item) => ({
          transferId: transfer._id as mongoose.Types.ObjectId,
          productId: new mongoose.Types.ObjectId(item.productId),
          quantity: item.quantity,
        })),
        { session }
      );

      const userAgentHeader = req.headers["user-agent"];
      await new AuditLog({
        userId: userObjectId,
        action: "TRANSFER_CREATED",
        entityType: "StockTransfer",
        entityId: transfer._id as mongoose.Types.ObjectId,
        after: {
          transferNo,
          fromBranchId: data.fromBranchId,
          toBranchId: data.toBranchId,
          totalQuantity,
          itemCount: data.items.length,
        },
        ipAddress: req.ip,
        userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
        timestamp: new Date(),
      }).save({ session });

      responseData = {
        _id: String(transfer._id),
        transferNo,
        fromBranch,
        toBranch,
        initiatedBy: { id: String(userObjectId), name: actorName },
        status: "PENDING",
        note: data.note ?? "",
        totalQuantity,
        items: data.items.map((item) => ({
          productId: item.productId,
          name: String(productMap.get(item.productId)?.name ?? ""),
          SKU: String(productMap.get(item.productId)?.SKU ?? ""),
          quantity: item.quantity,
        })),
        createdAt: new Date().toISOString(),
      };
    });

    if (!responseData) return res.status(500).json({ success: false, error: "Failed to create transfer" });
    return res.status(201).json({ success: true, data: responseData });
  } catch (error) {
    return fail(res, error, "Failed to create transfer");
  } finally {
    await session.endSession();
  }
}