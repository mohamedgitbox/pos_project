import { Router, Request, Response } from "express";
import { z, ZodError } from "zod";
import mongoose from "mongoose";
import Decimal from "decimal.js";
import { AuditLog, Branch, Sale, SaleItem, Product } from "../models";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { decrementStock } from "../services/inventoryService";
import { getNextSequence } from "../services/counterService";

const router = Router();
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const idSchema = objectIdSchema;

const checkoutSchema = z.object({
  branchId: objectIdSchema,
  items: z
    .array(
      z.object({
        productId: objectIdSchema,
        quantity: z.number().int().positive(),
        price: z.number().nonnegative().finite(),
      })
    )
    .min(1, "At least one item is required"),
});

type CheckoutItem = { productId: string; quantity: number; price: number };

type CheckoutResponse = {
  _id: string;
  invoiceNo: string;
  branchId: string;
  userId: string;
  totalAmount: string;
  timestamp: string;
  items: Array<CheckoutItem & { subtotal: string }>;
};

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

function fail(res: Response, error: unknown, fallback: string): Response {
  if (error instanceof ZodError) {
    return res.status(400).json({ success: false, error: "Validation failed", details: error.issues });
  }
  if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
    return res.status(409).json({ success: false, error: "Insufficient stock for one or more items" });
  }
  if (isDuplicate(error)) {
    return res.status(409).json({ success: false, error: "Duplicate request" });
  }
  console.error(error);
  return res.status(500).json({ success: false, error: fallback });
}

router.use(authMiddleware);

router.get("/branches", async (_req: Request, res: Response) => {
  try {
    const branches = await Branch.find().select("_id name").sort({ name: 1 }).lean();
    return res.json({
      success: true,
      data: branches.map((branch) => ({ _id: String(branch._id), name: branch.name })),
    });
  } catch (error) {
    return fail(res, error, "Failed to load branches");
  }
});

router.post("/", requireRole("ADMIN", "MANAGER", "CASHIER"), async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const data = checkoutSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const idempotencyKey = req.headers["idempotency-key"];
    const hasIdempotencyKey = typeof idempotencyKey === "string" && idempotencyKey.length > 0;

    if (hasIdempotencyKey) {
      const existingSale = await Sale.findOne({ idempotencyKey }).lean();

      if (existingSale) {
        interface ReplaySale {
          _id: unknown;
          invoiceNo: string;
          branchId: unknown;
          userId: unknown;
          totalAmount: { toString(): string };
          timestamp: Date;
        }

        interface ReplaySaleItem {
          productId: unknown;
          quantity: number;
          price: { toString(): string };
          subtotal?: { toString(): string };
        }

        const sale = existingSale as unknown as ReplaySale;
        const items = (await SaleItem.find({ saleId: sale._id }).lean()) as unknown as ReplaySaleItem[];

        return res.status(200).json({
          success: true,
          data: {
            _id: String(sale._id),
            invoiceNo: sale.invoiceNo,
            branchId: String(sale.branchId),
            userId: String(sale.userId),
            totalAmount: sale.totalAmount.toString(),
            timestamp: sale.timestamp.toISOString(),
            items: items.map((item) => ({
              productId: String(item.productId),
              quantity: item.quantity,
              price: parseFloat(item.price.toString()),
              subtotal: item.subtotal
                ? item.subtotal.toString()
                : new Decimal(item.price.toString()).mul(item.quantity).toFixed(2),
            })),
          },
        });
      }
    }

    const userBranchId = req.user.branchId ? String(req.user.branchId) : null;
    if (req.user.role !== "ADMIN" && userBranchId !== data.branchId) {
      return res.status(403).json({ success: false, error: "You can only sell from your assigned branch" });
    }

    const branchObjectId = new mongoose.Types.ObjectId(data.branchId);
    const userObjectId = new mongoose.Types.ObjectId(String(req.user._id));
    let response: CheckoutResponse | undefined;

    const sortedItems = [...data.items].sort((a, b) => a.productId.localeCompare(b.productId));

    await session.withTransaction(async () => {
      const invoiceNo = await getNextSequence("invoiceNo", session);

      // Calculate total amount using database prices
      let calculatedTotal = new Decimal(0);
      const saleItems = [];

      for (const item of sortedItems) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const itemPrice = new Decimal(product.sellingPrice.toString());
        const subtotal = itemPrice.mul(item.quantity);
        calculatedTotal = calculatedTotal.add(subtotal);

        // Validate that the provided price is within 1% of the database price
        const providedPrice = new Decimal(item.price);
        const priceDifference = Math.abs(itemPrice.minus(providedPrice).div(itemPrice).toNumber());
        if (priceDifference > 0.01) {
          console.warn(`Price mismatch for product ${item.productId}: provided ${item.price}, database ${product.sellingPrice}`);
        }

        saleItems.push({
          productId: new mongoose.Types.ObjectId(item.productId),
          quantity: item.quantity,
          price: mongoose.Types.Decimal128.fromString(itemPrice.toFixed(2)),
          subtotal: mongoose.Types.Decimal128.fromString(subtotal.toFixed(2)),
        });

        await decrementStock(
          new mongoose.Types.ObjectId(item.productId),
          branchObjectId,
          item.quantity,
          session
        );
      }

      const sale = new Sale({
        invoiceNo,
        branchId: branchObjectId,
        userId: userObjectId,
        totalAmount: mongoose.Types.Decimal128.fromString(calculatedTotal.toFixed(2)),
        timestamp: new Date(),
        ...(hasIdempotencyKey ? { idempotencyKey } : {}),
      });
      await sale.save({ session });

      await SaleItem.insertMany(
        saleItems.map((saleItem) => ({
          ...saleItem,
          saleId: sale._id as mongoose.Types.ObjectId,
        })),
        { session }
      );

      const userAgentHeader = req.headers["user-agent"];
      const audit = new AuditLog({
        userId: userObjectId,
        action: "CHECKOUT",
        entityType: "Sale",
        entityId: sale._id as mongoose.Types.ObjectId,
        after: {
          invoiceNo,
          branchId: data.branchId,
          totalAmount: calculatedTotal.toFixed(2),
          itemCount: data.items.length,
        },
        ipAddress: req.ip,
        userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
      });
      await audit.save({ session });

      response = {
        _id: String(sale._id),
        invoiceNo,
        branchId: data.branchId,
        userId: String(userObjectId),
        totalAmount: calculatedTotal.toFixed(2),
        timestamp: sale.timestamp.toISOString(),
        items: saleItems.map((saleItem) => ({
          productId: String(saleItem.productId),
          quantity: saleItem.quantity,
          price: parseFloat(saleItem.price.toString()),
          subtotal: saleItem.subtotal.toString(),
        })),
      };
    });

    if (!response) {
      return res.status(500).json({ success: false, error: "Checkout failed" });
    }

    return res.status(201).json({ success: true, data: response });
  } catch (error) {
    return fail(res, error, "Checkout failed");
  } finally {
    await session.endSession();
  }
});

// Get all sales (ADMIN/MANAGER)
router.get("/", requireRole("ADMIN", "MANAGER"), async (req: Request, res: Response) => {
  try {
    console.log("GET /api/v1/sales called");
    const { page = 1, limit = 20, startDate, endDate, branchId } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const filter: Record<string, unknown> = {};

    if (startDate || endDate) {
      const timestampFilter: Record<string, Date> = {};
      if (startDate) {
        const d = new Date(String(startDate));
        if (isNaN(d.getTime())) {
          return res.status(400).json({ success: false, error: "Invalid startDate" });
        }
        timestampFilter.$gte = d;
      }
      if (endDate) {
        const d = new Date(String(endDate));
        if (isNaN(d.getTime())) {
          return res.status(400).json({ success: false, error: "Invalid endDate" });
        }
        timestampFilter.$lte = d;
      }
      filter.timestamp = timestampFilter;
    }

    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(String(branchId))) {
        return res.status(400).json({ success: false, error: "Invalid branch ID" });
      }
      filter.branchId = new mongoose.Types.ObjectId(String(branchId));
    }

    if (req.user?.role !== "ADMIN") {
      const userBranchId = req.user?.branchId ? String(req.user.branchId) : null;
      if (userBranchId) {
        filter.branchId = new mongoose.Types.ObjectId(userBranchId);
      }
    }

    console.log("Filter:", filter);
    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate("branchId", "name")
        .populate("userId", "name email")
        .sort({ timestamp: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Sale.countDocuments(filter),
    ]);

    const formattedSales = sales.map((sale) => {
      const branch = sale.branchId as { _id: mongoose.Types.ObjectId; name: string } | mongoose.Types.ObjectId | null;
      const user = sale.userId as { _id: mongoose.Types.ObjectId; name: string; email: string } | mongoose.Types.ObjectId | null;
      
      const branchId = branch && typeof branch === "object" && "_id" in branch ? String(branch._id) : branch ? String(branch) : "";
      const branchName = branch && typeof branch === "object" && "name" in branch ? branch.name : "Unknown";
      const userId = user && typeof user === "object" && "_id" in user ? String(user._id) : user ? String(user) : "";
      const userName = user && typeof user === "object" && "name" in user ? user.name : "Unknown";
      const userEmail = user && typeof user === "object" && "email" in user ? user.email : "";
      
      return {
        _id: String(sale._id),
        invoiceNo: sale.invoiceNo,
        branch: { _id: branchId, name: branchName },
        user: { _id: userId, name: userName, email: userEmail },
        totalAmount: sale.totalAmount?.toString() || "0",
        timestamp: sale.timestamp?.toISOString() || "",
      };
    });

    return res.json({
      success: true,
      data: formattedSales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return fail(res, error, "Failed to load sales");
  }
});

// Get current user's sales
router.get("/my-sales", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const userObjectId = new mongoose.Types.ObjectId(String(req.user._id));

    interface MySale {
      _id: unknown;
      invoiceNo: string;
      branchId: { _id: unknown; name: string };
      totalAmount: { toString(): string };
      timestamp: Date;
    }

    const [sales, total] = await Promise.all([
      Sale.find({ userId: userObjectId })
        .populate("branchId", "name")
        .sort({ timestamp: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Sale.countDocuments({ userId: userObjectId }),
    ]) as unknown as [MySale[], number];

    const formattedSales = sales.map((sale) => ({
      _id: String(sale._id),
      invoiceNo: sale.invoiceNo,
      branch: { _id: String(sale.branchId._id), name: sale.branchId.name },
      totalAmount: sale.totalAmount.toString(),
      timestamp: sale.timestamp.toISOString(),
    }));

    return res.json({
      success: true,
      data: formattedSales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return fail(res, error, "Failed to load my sales");
  }
});

// Get single sale
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);

    const saleDoc = await Sale.findById(id).lean();

    if (!saleDoc) {
      return res.status(404).json({ success: false, error: "Sale not found" });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (req.user.role === "MANAGER") {
      if (!req.user.branchId || String(saleDoc.branchId) !== String(req.user.branchId)) {
        return res.status(403).json({ success: false, error: "You can only view sales for your assigned branch" });
      }
    } else if (req.user.role === "CASHIER") {
      if (String(saleDoc.userId) !== String(req.user._id)) {
        return res.status(403).json({ success: false, error: "You can only view your own sales" });
      }
    }

    interface PopulatedSaleSingle {
      _id: unknown;
      invoiceNo: string;
      branchId: { _id: unknown; name: string };
      userId: { _id: unknown; name: string; email: string };
      totalAmount: { toString(): string };
      timestamp: Date;
    }

    interface PopulatedSaleItem {
      _id: unknown;
      productId: { _id: unknown; name: string; SKU: string; barcode: string };
      quantity: number;
      price: { toString(): string };
      subtotal: { toString(): string };
    }

    const sale = (await Sale.findById(id)
      .populate("branchId", "name")
      .populate("userId", "name email")
      .lean()) as unknown as PopulatedSaleSingle | null;

    if (!sale) {
      return res.status(404).json({ success: false, error: "Sale not found" });
    }

    const saleItems = (await SaleItem.find({ saleId: id })
      .populate("productId", "name SKU barcode")
      .lean()) as unknown as PopulatedSaleItem[];

    const formattedItems = saleItems.map((item) => ({
      _id: String(item._id),
      product: item.productId
        ? {
            _id: String(item.productId._id),
            name: item.productId.name,
            SKU: item.productId.SKU,
            barcode: item.productId.barcode,
          }
        : null,
      quantity: item.quantity,
      price: item.price.toString(),
      subtotal: item.subtotal
        ? item.subtotal.toString()
        : new Decimal(item.price.toString()).mul(item.quantity).toFixed(2),
    }));

    const formattedSale = {
      _id: String(sale._id),
      invoiceNo: sale.invoiceNo,
      branch: { _id: String(sale.branchId._id), name: sale.branchId.name },
      user: { _id: String(sale.userId._id), name: sale.userId.name, email: sale.userId.email },
      totalAmount: sale.totalAmount.toString(),
      timestamp: sale.timestamp.toISOString(),
      items: formattedItems,
    };

    return res.json({ success: true, data: formattedSale });
  } catch (error) {
    return fail(res, error, "Failed to load sale");
  }
});

export default router;