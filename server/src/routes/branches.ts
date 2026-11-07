import { Router, Request, Response } from "express";
import { Branch } from "../models";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", async (_req: Request, res: Response) => {
  try {
    const branches = await Branch.find()
      .select("_id name type location phone")
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      data: branches.map((branch) => ({
        _id: String(branch._id),
        name: branch.name,
        type: branch.type,
        location: branch.location,
        phone: branch.phone,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to load branches" });
  }
});

export default router;