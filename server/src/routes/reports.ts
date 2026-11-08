import { Router, Request, Response } from "express";
import Decimal from "decimal.js";
import { Sale, Branch, Inventory } from "../models";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Dashboard endpoint to fetch KPIs
router.get("/dashboard", authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await Sale.aggregate([
      { $match: { timestamp: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // Total revenue (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sevenDaysSales = await Sale.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // Low stock count (products with stock < 5 in any branch)
    const lowStockCount = await Inventory.countDocuments({ quantity: { $lt: 5 } });

    // Active branches count
    const activeBranchesCount = await Branch.countDocuments();

    // Sales by branch (for chart)
    const salesByBranch = await Sale.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo, $lt: tomorrow } } },
      { $group: { _id: "$branchId", total: { $sum: "$totalAmount" } } },
      { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "branch" } },
      { $unwind: "$branch" },
      { $project: { branchName: "$branch.name", total: 1 } },
    ]);

    // Format the response
    const dashboardData = {
      todaysSales: todaySales[0]?.total ? new Decimal(todaySales[0].total.toString()).toFixed(2) : "0.00",
      totalRevenue: sevenDaysSales[0]?.total ? new Decimal(sevenDaysSales[0].total.toString()).toFixed(2) : "0.00",
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