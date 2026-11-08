import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Inventory } from "../models";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Get products with their stock for a specific branch
router.get("/branch/:branchId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const branchId = req.params.branchId as string;

    // Validate branchId
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ success: false, error: "Invalid branch ID" });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);

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

export default router;