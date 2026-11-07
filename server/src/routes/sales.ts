import { Router, Request, Response } from "express";
import { z, ZodError } from "zod";
import mongoose from "mongoose";
import Decimal from "decimal.js";
import { AuditLog, Branch, Sale, SaleItem } from "../models";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { decrementStock } from "../services/inventoryService";
import { getNextSequence } from "../services/counterService";

const router = Router();
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

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
    return res.status(409).json({ success: false, error: "Duplicate invoice or sale record" });
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

    const userBranchId = req.user.branchId ? String(req.user.branchId) : null;
    if (req.user.role !== "ADMIN" && userBranchId !== data.branchId) {
      return res.status(403).json({ success: false, error: "You can only sell from your assigned branch" });
    }

    const branchObjectId = new mongoose.Types.ObjectId(data.branchId);
    const userObjectId = new mongoose.Types.ObjectId(String(req.user._id));
    const total = data.items.reduce(
      (sum, item) => sum.plus(new Decimal(item.price).mul(item.quantity)),
      new Decimal(0)
    );
    const totalAmount = total.toFixed(2);
    let response: CheckoutResponse | undefined;

    await session.withTransaction(async () => {
      const invoiceNo = await getNextSequence("invoiceNo", session);

      for (const item of data.items) {
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
        totalAmount: mongoose.Types.Decimal128.fromString(totalAmount),
        timestamp: new Date(),
      });
      await sale.save({ session });

      await SaleItem.insertMany(
        data.items.map((item) => ({
          saleId: sale._id as mongoose.Types.ObjectId,
          productId: new mongoose.Types.ObjectId(item.productId),
          quantity: item.quantity,
          price: mongoose.Types.Decimal128.fromString(new Decimal(item.price).toFixed(2)),
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
          totalAmount,
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
        totalAmount,
        timestamp: sale.timestamp.toISOString(),
        items: data.items.map((item) => ({
          ...item,
          subtotal: new Decimal(item.price).mul(item.quantity).toFixed(2),
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

export default router;