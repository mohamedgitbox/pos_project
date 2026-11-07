import { Router, Request, Response } from "express";
import { z, ZodError } from "zod";
import mongoose from "mongoose";
import Decimal from "decimal.js";
import { AuditLog, Branch, Inventory, Product, PurchaseItem, PurchaseOrder } from "../models";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { incrementStock } from "../services/inventoryService";
import { getNextSequence } from "../services/counterService";

const router = Router();
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const createSchema = z.object({
  supplierName: z.string().trim().min(1, "Supplier name is required"),
  branchId: idSchema,
  items: z
    .array(
      z.object({
        productId: idSchema,
        orderedQty: z.number().int().positive(),
        unitCost: z.number().nonnegative().finite(),
      })
    )
    .min(1, "At least one item is required"),
});

const statusSchema = z.object({
  status: z.enum(["ORDERED", "RECEIVED", "CANCELLED"]),
});

type OrderDoc = {
  _id: unknown;
  poNumber: string;
  supplierName: string;
  branchId: unknown;
  createdBy: unknown;
  totalCost: unknown;
  status: string;
  createdAt?: unknown;
};

type ItemDoc = {
  _id: unknown;
  poId?: unknown;
  productId: unknown;
  orderedQty: number;
  unitCost: unknown;
};

function decimalString(value: unknown): string {
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String((value as { toString(): string }).toString());
  }
  return String(value ?? "0");
}

function branchInfo(value: unknown): { id: string; name: string } {
  if (typeof value === "object" && value !== null && "name" in value) {
    const obj = value as { _id?: unknown; name?: unknown };
    return { id: String(obj._id ?? ""), name: String(obj.name ?? "") };
  }
  return { id: String(value ?? ""), name: "" };
}

function productInfo(value: unknown): { id: string; name: string; SKU: string } {
  if (typeof value === "object" && value !== null && "name" in value) {
    const obj = value as { _id?: unknown; name?: unknown; SKU?: unknown };
    return { id: String(obj._id ?? ""), name: String(obj.name ?? ""), SKU: String(obj.SKU ?? "") };
  }
  return { id: String(value ?? ""), name: "", SKU: "" };
}

function dateValue(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

function fail(res: Response, error: unknown, fallback: string): Response {
  if (error instanceof ZodError) {
    return res.status(400).json({ success: false, error: "Validation failed", details: error.issues });
  }
  if (isDuplicate(error)) {
    return res.status(409).json({ success: false, error: "Duplicate purchase order record" });
  }
  console.error(error);
  return res.status(500).json({ success: false, error: fallback });
}

router.use(authMiddleware);

router.get("/", async (_req: Request, res: Response) => {
  try {
    const orders = (await PurchaseOrder.find()
      .sort({ createdAt: -1 })
      .populate("branchId", "name")
      .lean()) as unknown as OrderDoc[];

    return res.json({
      success: true,
      data: orders.map((order) => ({
        _id: String(order._id),
        poNumber: order.poNumber,
        supplierName: order.supplierName,
        branch: branchInfo(order.branchId),
        status: order.status,
        totalCost: decimalString(order.totalCost),
        createdAt: dateValue(order.createdAt),
      })),
    });
  } catch (error) {
    return fail(res, error, "Failed to load purchase orders");
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const po = (await PurchaseOrder.findById(id)
      .populate("branchId", "name")
      .lean()) as unknown as OrderDoc | null;

    if (!po) {
      return res.status(404).json({ success: false, error: "Purchase order not found" });
    }

    const branch = branchInfo(po.branchId);
    const actorBranchId = req.user.branchId ? String(req.user.branchId) : null;
    if (req.user.role !== "ADMIN" && actorBranchId !== branch.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const items = (await PurchaseItem.find({ poId: id })
      .populate("productId", "name SKU")
      .lean()) as unknown as ItemDoc[];

    return res.json({
      success: true,
      data: {
        _id: String(po._id),
        poNumber: po.poNumber,
        supplierName: po.supplierName,
        branch,
        status: po.status,
        totalCost: decimalString(po.totalCost),
        createdAt: dateValue(po.createdAt),
        items: items.map((item) => ({
          _id: String(item._id),
          product: productInfo(item.productId),
          orderedQty: item.orderedQty,
          unitCost: decimalString(item.unitCost),
          subtotal: new Decimal(decimalString(item.unitCost)).mul(item.orderedQty).toFixed(2),
        })),
      },
    });
  } catch (error) {
    return fail(res, error, "Failed to load purchase order");
  }
});

router.post("/", requireRole("ADMIN", "MANAGER"), async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const data = createSchema.parse(req.body);
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const actorId = new mongoose.Types.ObjectId(String(req.user._id));
    const actorBranchId = req.user.branchId ? String(req.user.branchId) : null;
    if (req.user.role !== "ADMIN" && actorBranchId !== data.branchId) {
      return res.status(403).json({ success: false, error: "You can only create purchase orders for your assigned branch" });
    }

    if (!(await Branch.exists({ _id: data.branchId }))) {
      return res.status(404).json({ success: false, error: "Branch not found" });
    }

    const productIds = Array.from(new Set(data.items.map((item) => item.productId)));
    const productCount = await Product.countDocuments({ _id: { $in: productIds } });
    if (productCount !== productIds.length) {
      return res.status(400).json({ success: false, error: "One or more products were not found" });
    }

    const totalCost = data.items
      .reduce((sum, item) => sum.plus(new Decimal(item.unitCost).mul(item.orderedQty)), new Decimal(0))
      .toFixed(2);
    const userAgentHeader = req.headers["user-agent"];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;
    let poNumber = "";
    let orderId = "";

    await session.withTransaction(async () => {
      poNumber = await getNextSequence("poNumber", session);
      const order = new PurchaseOrder({
        poNumber,
        supplierName: data.supplierName,
        branchId: new mongoose.Types.ObjectId(data.branchId),
        createdBy: actorId,
        totalCost: mongoose.Types.Decimal128.fromString(totalCost),
        status: "DRAFT",
      });
      await order.save({ session });
      orderId = String(order._id);

      await PurchaseItem.insertMany(
        data.items.map((item) => ({
          poId: order._id as mongoose.Types.ObjectId,
          productId: new mongoose.Types.ObjectId(item.productId),
          orderedQty: item.orderedQty,
          unitCost: mongoose.Types.Decimal128.fromString(new Decimal(item.unitCost).toFixed(2)),
        })),
        { session }
      );

      const audit = new AuditLog({
        userId: actorId,
        action: "PO_CREATED",
        entityType: "PurchaseOrder",
        entityId: order._id as mongoose.Types.ObjectId,
        after: { poNumber, totalCost, itemCount: data.items.length },
        ipAddress: req.ip,
        userAgent,
        timestamp: new Date(),
      });
      await audit.save({ session });
    });

    return res.status(201).json({ success: true, data: { _id: orderId, poNumber, status: "DRAFT", totalCost } });
  } catch (error) {
    return fail(res, error, "Failed to create purchase order");
  } finally {
    await session.endSession();
  }
});

router.put("/:id/status", requireRole("ADMIN", "MANAGER"), async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);
    const { status } = statusSchema.parse(req.body);
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const actorId = new mongoose.Types.ObjectId(String(req.user._id));
    const actorRole = req.user.role;
    const actorBranchId = req.user.branchId ? String(req.user.branchId) : null;
    const userAgentHeader = req.headers["user-agent"];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;
    let poNumber = "";

    await session.withTransaction(async () => {
      const current = (await PurchaseOrder.findById(id).session(session).lean()) as unknown as OrderDoc | null;
      if (!current) throw new Error("NOT_FOUND");

      const branch = branchInfo(current.branchId);
      if (actorRole !== "ADMIN" && actorBranchId !== branch.id) throw new Error("FORBIDDEN");

      const allowed: Record<string, string[]> = {
        DRAFT: ["ORDERED", "CANCELLED"],
        ORDERED: ["RECEIVED", "CANCELLED"],
        RECEIVED: [],
        CANCELLED: [],
      };
      if (!allowed[current.status]?.includes(status)) throw new Error("INVALID_TRANSITION");

      poNumber = current.poNumber;

      if (status === "RECEIVED") {
        const items = (await PurchaseItem.find({ poId: id }).session(session).lean()) as unknown as ItemDoc[];
        const aggregated = new Map<string, { qty: number; cost: Decimal }>();

        for (const item of items) {
          const productId = String(item.productId);
          const qty = item.orderedQty;
          const cost = new Decimal(decimalString(item.unitCost)).mul(qty);
          const existing = aggregated.get(productId);
          if (existing) {
            existing.qty += qty;
            existing.cost = existing.cost.plus(cost);
          } else {
            aggregated.set(productId, { qty, cost });
          }
        }

        const branchObjectId = new mongoose.Types.ObjectId(branch.id);
        for (const [productIdString, agg] of aggregated) {
          const productId = new mongoose.Types.ObjectId(productIdString);
          const inventory = (await Inventory.findOne({ productId, branchId: branchObjectId })
            .session(session)
            .lean()) as unknown as { quantity?: number } | null;
          const product = (await Product.findById(productId).session(session).lean()) as unknown as { costPrice?: unknown } | null;
          if (!product) throw new Error("PRODUCT_NOT_FOUND");

          const oldQty = inventory?.quantity ?? 0;
          const oldCost = new Decimal(decimalString(product.costPrice));
          const denominator = new Decimal(oldQty).plus(agg.qty);
          const newAvgCost = denominator.isZero()
            ? agg.cost.div(agg.qty)
            : oldCost.mul(oldQty).plus(agg.cost).div(denominator);

          await incrementStock(productId, branchObjectId, agg.qty, session);
          await Product.updateOne(
            { _id: productId },
            { costPrice: mongoose.Types.Decimal128.fromString(newAvgCost.toFixed(4)) },
            { session }
          );
        }
      }

      await PurchaseOrder.updateOne({ _id: id }, { status }, { session });
      const action = status === "RECEIVED" ? "PO_RECEIVED" : status === "CANCELLED" ? "PO_CANCELLED" : "PO_ORDERED";
      const audit = new AuditLog({
        userId: actorId,
        action,
        entityType: "PurchaseOrder",
        entityId: new mongoose.Types.ObjectId(id),
        after: { poNumber, status },
        ipAddress: req.ip,
        userAgent,
        timestamp: new Date(),
      });
      await audit.save({ session });
    });

    return res.json({ success: true, data: { _id: id, poNumber, status } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") return res.status(404).json({ success: false, error: "Purchase order not found" });
      if (error.message === "FORBIDDEN") return res.status(403).json({ success: false, error: "Forbidden" });
      if (error.message === "INVALID_TRANSITION") return res.status(400).json({ success: false, error: "Invalid status transition" });
      if (error.message === "PRODUCT_NOT_FOUND") return res.status(400).json({ success: false, error: "One or more products were not found" });
    }
    return fail(res, error, "Failed to update purchase order status");
  } finally {
    await session.endSession();
  }
});

router.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const actorId = new mongoose.Types.ObjectId(String(req.user._id));
    const actorRole = req.user.role;
    const actorBranchId = req.user.branchId ? String(req.user.branchId) : null;
    const userAgentHeader = req.headers["user-agent"];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;
    let poNumber = "";

    await session.withTransaction(async () => {
      const current = (await PurchaseOrder.findById(id).session(session).lean()) as unknown as OrderDoc | null;
      if (!current) throw new Error("NOT_FOUND");

      const branch = branchInfo(current.branchId);
      if (actorRole !== "ADMIN" && actorBranchId !== branch.id) throw new Error("FORBIDDEN");
      if (!["DRAFT", "CANCELLED"].includes(current.status)) throw new Error("INVALID_DELETE");

      poNumber = current.poNumber;
      await PurchaseItem.deleteMany({ poId: id }, { session });
      await PurchaseOrder.deleteOne({ _id: id }, { session });

      const audit = new AuditLog({
        userId: actorId,
        action: "PO_DELETED",
        entityType: "PurchaseOrder",
        entityId: new mongoose.Types.ObjectId(id),
        after: { poNumber, status: current.status },
        ipAddress: req.ip,
        userAgent,
        timestamp: new Date(),
      });
      await audit.save({ session });
    });

    return res.json({ success: true, data: { id } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") return res.status(404).json({ success: false, error: "Purchase order not found" });
      if (error.message === "FORBIDDEN") return res.status(403).json({ success: false, error: "Forbidden" });
      if (error.message === "INVALID_DELETE") return res.status(400).json({ success: false, error: "Only DRAFT or CANCELLED purchase orders can be deleted" });
    }
    return fail(res, error, "Failed to delete purchase order");
  } finally {
    await session.endSession();
  }
});

export default router;