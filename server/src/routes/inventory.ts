import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Inventory, Branch } from "../models";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();

router.use(authMiddleware);

// Get products with their stock for a specific branch
router.get("/branch/:branchId", async (req: Request, res: Response) => {
  try {
    const branchId = req.params.branchId as string;

    // Validate branchId
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ success: false, error: "Invalid branch ID" });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);

    // Check branch scoping for non-ADMIN users
    if (req.user?.role !== "ADMIN") {
      const userBranchId = req.user?.branchId ? String(req.user.branchId) : null;
      if (userBranchId && String(branchObjectId) !== userBranchId) {
        return res.status(403).json({ success: false, error: "You can only view inventory for your assigned branch" });
      }
    }

    // Fetch inventory for the branch and populate product details
    const inventory = await Inventory.aggregate([
      { $match: { branchId: branchObjectId } },
      { $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      }},
      { $unwind: "$product" },
      { $match: { "product.isDeleted": false } },
      { $project: {
        _id: 0,
        productId: { $toString: "$product._id" },
        name: "$product.name",
        SKU: "$product.SKU",
        barcode: "$product.barcode",
        costPrice: { $toString: "$product.costPrice" },
        sellingPrice: { $toString: "$product.sellingPrice" },
        stock: "$quantity",
      }},
    ]);

    // Format the response
    const productsWithStock = inventory.map((item) => ({
      _id: item.productId,
      productId: item.productId,
      name: item.name,
      SKU: item.SKU,
      barcode: item.barcode,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      stock: item.stock,
    }));

    return res.json({ success: true, data: productsWithStock });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to fetch branch inventory" });
  }
});

// Get inventory overview across all branches (ADMIN/MANAGER)
router.get("/", requireRole("ADMIN", "MANAGER"), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, branchId, lowStock } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const filter: Record<string, unknown> = {};

    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(String(branchId))) {
        return res.status(400).json({ success: false, error: "Invalid branch ID" });
      }
      filter.branchId = new mongoose.Types.ObjectId(String(branchId));
    }

    if (lowStock === "true") {
      filter.quantity = { $lt: 5 };
    }

    if (req.user?.role !== "ADMIN") {
      const userBranchId = req.user?.branchId ? String(req.user.branchId) : null;
      if (userBranchId) {
        filter.branchId = new mongoose.Types.ObjectId(userBranchId);
      }
    }

    const [inventory, total] = await Promise.all([
      Inventory.find(filter)
        .populate("branchId", "name")
        .populate("productId", "name SKU barcode costPrice sellingPrice")
        .sort({ quantity: 1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Inventory.countDocuments(filter),
    ]);

    interface PopulatedInventory {
      _id: unknown;
      productId: { _id: unknown; name: string; SKU: string; barcode: string; costPrice: { toString(): string }; sellingPrice: { toString(): string } };
      branchId: { _id: unknown; name: string };
      quantity: number;
      minLevel: number;
    }

    const formattedInventory = inventory.map((item) => {
      const populatedItem = item as unknown as PopulatedInventory;
      return {
        _id: String(populatedItem._id),
        product: {
          _id: String(populatedItem.productId._id),
          name: populatedItem.productId.name,
          SKU: populatedItem.productId.SKU,
          barcode: populatedItem.productId.barcode,
          costPrice: populatedItem.productId.costPrice.toString(),
          sellingPrice: populatedItem.productId.sellingPrice.toString(),
        },
        branch: { _id: String(populatedItem.branchId._id), name: populatedItem.branchId.name },
        quantity: populatedItem.quantity,
        minLevel: populatedItem.minLevel,
      };
    });

    return res.json({
      success: true,
      data: formattedInventory,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to fetch inventory" });
  }
});

// Get inventory summary by branch
router.get("/summary", requireRole("ADMIN", "MANAGER"), async (_req: Request, res: Response) => {
  try {
    const branches = await Branch.find().select("_id name").lean();

    const summary = await Promise.all(
      branches.map(async (branch) => {
        const inventory = await Inventory.find({ branchId: branch._id })
          .populate("productId", "name")
          .lean();

        const totalProducts = inventory.length;
        const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
        const lowStock = inventory.filter((item) => item.quantity < item.minLevel).length;

        return {
          branch: { _id: String(branch._id), name: branch.name },
          totalProducts,
          totalQuantity,
          lowStock,
        };
      })
    );

    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to fetch inventory summary" });
  }
});

export default router;
