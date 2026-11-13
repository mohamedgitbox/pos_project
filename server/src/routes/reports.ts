import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import Decimal from "decimal.js";
import { Sale, Branch, Inventory } from "../models";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Helper to get branch filter based on user role
function getBranchFilter(user: { role: string; branchId: string | null }) {
  const role = String(user.role);
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return null; // No filter - all branches
  }
  return user.branchId ? new mongoose.Types.ObjectId(user.branchId) : null;
}

// Daily sales trend for line/area charts
router.get("/daily-sales", authMiddleware, async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse query params with validation
    const dateRange = (req.query.dateRange as string) || "7d";
    const branchIdParam = req.query.branchId as string | undefined;

    if (!["today", "7d", "30d"].includes(dateRange)) {
      return res.status(400).json({ success: false, error: "Invalid dateRange. Expected today, 7d or 30d" });
    }

    let startDate: Date;
    let endDate: Date = today;

    switch (dateRange) {
      case "today":
        startDate = today;
        break;
      case "30d":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
    }

    // Build match filter
    const matchStage: { timestamp: { $gte: Date; $lt: Date }; branchId?: mongoose.Types.ObjectId } = {
      timestamp: { $gte: startDate, $lt: new Date(endDate.getTime() + 86400000) },
    };

    // Handle branch scoping: scoped roles are ALWAYS forced to their own branch,
    // even if they pass branchId. Only ADMIN/SUPER_ADMIN may override or see all.
    const role = req.user ? String(req.user.role) : "";
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    if (isAdmin) {
      if (branchIdParam) {
        if (!mongoose.Types.ObjectId.isValid(branchIdParam)) {
          return res.status(400).json({ success: false, error: "Invalid branch ID" });
        }
        matchStage.branchId = new mongoose.Types.ObjectId(branchIdParam);
      }
      // else: all branches
    } else {
      const ownBranch = getBranchFilter(req.user as { role: string; branchId: string | null });
      if (ownBranch) matchStage.branchId = ownBranch;
    }

    // Aggregate by day
    const dailySales = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          total: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Zero-fill missing days. Field names match the client contract (sales/count).
    const result: { date: string; sales: number; count: number }[] = [];
    const current = new Date(startDate);
    for (let i = 0; i <= Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)); i++) {
      const dateStr = current.toISOString().split('T')[0];
      const existing = dailySales.find(d => d._id === dateStr);
      result.push({
        date: dateStr,
        sales: existing ? parseFloat(existing.total.toString()) : 0,
        count: existing ? existing.count : 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to fetch daily sales data" });
  }
});

// Dashboard endpoint to fetch KPIs.
// Optional dateRange/branchId params so dashboard filters apply to ALL sections
// consistently. Defaults preserve the previous (7d, all-branches) behavior.
router.get("/dashboard", authMiddleware, async (req: Request, res: Response) => {
  try {
    const dateRange = (req.query.dateRange as string) || "7d";
    const branchIdParam = req.query.branchId as string | undefined;

    if (!["today", "7d", "30d"].includes(dateRange)) {
      return res.status(400).json({ success: false, error: "Invalid dateRange. Expected today, 7d or 30d" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let rangeStart = new Date(today);
    if (dateRange === "30d") {
      rangeStart.setDate(rangeStart.getDate() - 30);
    } else if (dateRange === "7d") {
      rangeStart.setDate(rangeStart.getDate() - 7);
    }

    // Branch scoping: scoped roles forced to own branch; ADMIN may override or see all.
    const branchMatch: { branchId?: mongoose.Types.ObjectId } = {};
    const role = req.user ? String(req.user.role) : "";
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    if (isAdmin) {
      if (branchIdParam) {
        if (!mongoose.Types.ObjectId.isValid(branchIdParam)) {
          return res.status(400).json({ success: false, error: "Invalid branch ID" });
        }
        branchMatch.branchId = new mongoose.Types.ObjectId(branchIdParam);
      }
    } else {
      const ownBranch = getBranchFilter(req.user as { role: string; branchId: string | null });
      if (ownBranch) branchMatch.branchId = ownBranch;
    }

    // Today's sales
    const todaySales = await Sale.aggregate([
      { $match: { timestamp: { $gte: today, $lt: tomorrow }, ...branchMatch } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // Total revenue over the selected range
    const rangeSales = await Sale.aggregate([
      { $match: { timestamp: { $gte: rangeStart, $lt: tomorrow }, ...branchMatch } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // Low stock count (products with stock < 5 in any branch)
    const lowStockCount = await Inventory.countDocuments({ quantity: { $lt: 5 } });

    // Active branches count
    const activeBranchesCount = await Branch.countDocuments();

    // Sales by branch (for chart)
    const salesByBranch = await Sale.aggregate([
      { $match: { timestamp: { $gte: rangeStart, $lt: tomorrow }, ...branchMatch } },
      { $group: { _id: "$branchId", total: { $sum: "$totalAmount" } } },
      { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "branch" } },
      { $unwind: "$branch" },
      { $project: { branchName: "$branch.name", total: 1 } },
    ]);

    // Format the response
    const dashboardData = {
      todaysSales: todaySales[0]?.total ? new Decimal(todaySales[0].total.toString()).toFixed(2) : "0.00",
      totalRevenue: rangeSales[0]?.total ? new Decimal(rangeSales[0].total.toString()).toFixed(2) : "0.00",
      lowStockCount,
      activeBranchesCount,
      salesByBranch: salesByBranch.map((item) => ({
        branchName: item.branchName,
        total: new Decimal(item.total.toString()).toFixed(2),
      })),
    };

    return res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
  }
});

export default router;