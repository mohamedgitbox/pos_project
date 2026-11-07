import { Router, Request, Response } from "express";
import { z, ZodError } from "zod";
import mongoose from "mongoose";
import { Product, Inventory, Branch, AuditLog, type IInventory } from "../models";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const priceSchema = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Price must have up to 2 decimals");
const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  SKU: z.string().trim().min(1, "SKU is required"),
  barcode: z.string().trim().min(1, "Barcode is required"),
  costPrice: priceSchema,
  sellingPrice: priceSchema,
});
const updateSchema = createSchema.partial();

type ProductLike = {
  _id: unknown;
  name: string;
  SKU: string;
  barcode: string;
  costPrice: { toString(): string };
  sellingPrice: { toString(): string };
};

type Serialized = {
  _id: string;
  name: string;
  SKU: string;
  barcode: string;
  costPrice: string;
  sellingPrice: string;
  totalStock: number;
};

function serialize(product: ProductLike, totalStock: number): Serialized {
  return {
    _id: String(product._id),
    name: product.name,
    SKU: product.SKU,
    barcode: product.barcode,
    costPrice: product.costPrice.toString(),
    sellingPrice: product.sellingPrice.toString(),
    totalStock,
  };
}

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

function fail(res: Response, error: unknown, fallback: string): Response {
  if (error instanceof ZodError) {
    return res.status(400).json({ success: false, error: "Validation failed", details: error.issues });
  }
  if (isDuplicate(error)) {
    return res.status(409).json({ success: false, error: "SKU must be unique" });
  }
  console.error(error);
  return res.status(500).json({ success: false, error: fallback });
}

async function totalStockFor(productId: string): Promise<number> {
  const rows = (await Inventory.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, totalStock: { $sum: "$quantity" } } },
  ])) as unknown as Array<{ totalStock: number }>;
  return rows[0]?.totalStock ?? 0;
}

router.use(authMiddleware);

router.get("/", async (_req: Request, res: Response) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    const rows = (await Inventory.aggregate([
      { $group: { _id: "$productId", totalStock: { $sum: "$quantity" } } },
    ])) as unknown as Array<{ _id: unknown; totalStock: number }>;
    const stock = new Map<string, number>(rows.map((row) => [String(row._id), row.totalStock] as [string, number]));
    return res.json({
      success: true,
      data: products.map((product) => serialize(product, stock.get(String(product._id)) ?? 0)),
    });
  } catch (error) {
    return fail(res, error, "Failed to load products");
  }
});

router.post("/", requireRole("ADMIN", "MANAGER"), async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const product = await Product.create({
      name: data.name,
      SKU: data.SKU,
      barcode: data.barcode,
      costPrice: data.costPrice as unknown as mongoose.Types.Decimal128,
      sellingPrice: data.sellingPrice as unknown as mongoose.Types.Decimal128,
    });

    try {
      const branches = await Branch.find().select("_id").lean();
      if (branches.length > 0) {
        await Inventory.insertMany(
          branches.map((branch) => ({
            productId: product._id as mongoose.Types.ObjectId,
            branchId: branch._id as mongoose.Types.ObjectId,
            quantity: 0,
            minLevel: 10,
          }))
        );
      }
    } catch (rollbackError) {
      await Product.findByIdAndDelete(product._id as mongoose.Types.ObjectId);
      throw rollbackError;
    }

    return res.status(201).json({ success: true, data: serialize(product, 0) });
  } catch (error) {
    return fail(res, error, "Failed to create product");
  }
});

router.put("/:id", requireRole("ADMIN", "MANAGER"), async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);
    const data = updateSchema.parse(req.body);
    const update: {
      name?: string;
      SKU?: string;
      barcode?: string;
      costPrice?: mongoose.Types.Decimal128;
      sellingPrice?: mongoose.Types.Decimal128;
    } = {};

    if (data.name !== undefined) update.name = data.name;
    if (data.SKU !== undefined) update.SKU = data.SKU;
    if (data.barcode !== undefined) update.barcode = data.barcode;
    if (data.costPrice !== undefined) update.costPrice = data.costPrice as unknown as mongoose.Types.Decimal128;
    if (data.sellingPrice !== undefined) update.sellingPrice = data.sellingPrice as unknown as mongoose.Types.Decimal128;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    const updated = await Product.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    return res.json({ success: true, data: serialize(updated, await totalStockFor(id)) });
  } catch (error) {
    return fail(res, error, "Failed to update product");
  }
});

router.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    await Inventory.deleteMany({ productId: new mongoose.Types.ObjectId(id) });
    return res.json({ success: true, data: { id } });
  } catch (error) {
    return fail(res, error, "Failed to delete product");
  }
});

const adjustStockSchema = z.object({
  branchId: idSchema,
  quantity: z.number().int().finite(),
  type: z.enum(["ADD", "REMOVE", "SET"]),
});

router.post("/:id/adjust-stock", requireRole("ADMIN", "MANAGER"), async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);
    const data = adjustStockSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!(await Product.exists({ _id: id }))) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    if (!(await Branch.exists({ _id: data.branchId }))) {
      return res.status(404).json({ success: false, error: "Branch not found" });
    }

    const productId = new mongoose.Types.ObjectId(id);
    const branchId = new mongoose.Types.ObjectId(data.branchId);
    const userObjectId = new mongoose.Types.ObjectId(String(req.user._id));
    let inventory: IInventory | null = null;

    if (data.type === "SET") {
      if (data.quantity < 0) {
        return res.status(400).json({ success: false, error: "Insufficient stock for this adjustment" });
      }

      inventory = await Inventory.findOneAndUpdate(
        { productId, branchId },
        {
          $set: { quantity: data.quantity },
          $setOnInsert: { minLevel: 10 },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      );
    } else {
      const delta = data.type === "ADD" ? data.quantity : -data.quantity;

      if (delta >= 0) {
        inventory = await Inventory.findOneAndUpdate(
          { productId, branchId },
          {
            $inc: { quantity: delta },
            $setOnInsert: { minLevel: 10 },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
        );
      } else {
        inventory = await Inventory.findOneAndUpdate(
          { productId, branchId, quantity: { $gte: -delta } },
          { $inc: { quantity: delta } },
          { new: true, runValidators: true }
        );

        if (!inventory) {
          return res.status(400).json({ success: false, error: "Insufficient stock for this adjustment" });
        }
      }
    }

    if (!inventory) {
      return res.status(400).json({ success: false, error: "Unable to adjust stock" });
    }

    const userAgentHeader = req.headers["user-agent"];
    await AuditLog.create({
      userId: userObjectId,
      action: "INVENTORY_ADJUST",
      entityType: "Inventory",
      entityId: inventory._id as mongoose.Types.ObjectId,
      after: {
        productId: id,
        branchId: data.branchId,
        type: data.type,
        requestedQuantity: data.quantity,
        newQuantity: inventory.quantity,
      },
      ipAddress: req.ip,
      userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
      timestamp: new Date(),
    });

    return res.json({
      success: true,
      data: {
        _id: String(inventory._id),
        productId: String(inventory.productId),
        branchId: String(inventory.branchId),
        quantity: inventory.quantity,
        minLevel: inventory.minLevel,
      },
    });
  } catch (error) {
    return fail(res, error, "Failed to adjust stock");
  }
});

export default router;