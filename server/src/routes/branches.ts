import { Router, Request, Response } from "express";
import { z, ZodError } from "zod";
import mongoose from "mongoose";
import { Branch, AuditLog } from "../models";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const createBranchSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.string().trim().min(1, "Type is required"),
  location: z.string().trim().min(1, "Location is required"),
  phone: z.string().trim().min(1, "Phone is required"),
});

const updateBranchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  type: z.string().trim().min(1, "Type is required").optional(),
  location: z.string().trim().min(1, "Location is required").optional(),
  phone: z.string().trim().min(1, "Phone is required").optional(),
});

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

function fail(res: Response, error: unknown, fallback: string): Response {
  if (error instanceof ZodError) {
    return res.status(400).json({ success: false, error: "Validation failed", details: error.issues });
  }
  if (isDuplicate(error)) {
    return res.status(409).json({ success: false, error: "Branch name already exists" });
  }
  console.error(error);
  return res.status(500).json({ success: false, error: fallback });
}

interface BranchDoc {
  _id: unknown;
  name: string;
  type: string;
  location: string;
  phone: string;
  createdAt?: Date;
}

function serializeBranch(branch: BranchDoc): Record<string, unknown> {
  return {
    _id: String(branch._id),
    name: branch.name,
    type: branch.type,
    location: branch.location,
    phone: branch.phone,
    createdAt: branch.createdAt?.toISOString(),
  };
}

router.use(authMiddleware);

router.get("/", async (_req: Request, res: Response) => {
  try {
    const branches = await Branch.find()
      .select("_id name type location phone")
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      data: branches.map((branch) => serializeBranch(branch as BranchDoc)),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to load branches" });
  }
});

// Create branch (ADMIN only)
router.post("/", requireRole("ADMIN"), async (req: Request, res: Response) => {
  try {
    const data = createBranchSchema.parse(req.body);

    const branch = await Branch.create({
      name: data.name,
      type: data.type,
      location: data.location,
      phone: data.phone,
    });

    const userAgentHeader = req.headers["user-agent"];
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(String(req.user?._id)),
      action: "CREATE",
      entityType: "Branch",
      entityId: branch._id as mongoose.Types.ObjectId,
      after: { name: data.name, type: data.type, location: data.location, phone: data.phone },
      ipAddress: req.ip,
      userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
      timestamp: new Date(),
    });

    return res.status(201).json({
      success: true,
      data: serializeBranch(branch as BranchDoc),
    });
  } catch (error) {
    return fail(res, error, "Failed to create branch");
  }
});

// Get single branch
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);

    const branch = (await Branch.findById(id).lean()) as BranchDoc | null;

    if (!branch) {
      return res.status(404).json({ success: false, error: "Branch not found" });
    }

    return res.json({
      success: true,
      data: serializeBranch(branch),
    });
  } catch (error) {
    return fail(res, error, "Failed to load branch");
  }
});

// Update branch (ADMIN only)
router.put("/:id", requireRole("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);
    const data = updateBranchSchema.parse(req.body);

    const existingBranch = await Branch.findById(id);
    if (!existingBranch) {
      return res.status(404).json({ success: false, error: "Branch not found" });
    }

    const updateData: Record<string, string> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.phone !== undefined) updateData.phone = data.phone;

    const branch = (await Branch.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .lean()) as BranchDoc | null;

    if (!branch) {
      return res.status(404).json({ success: false, error: "Branch not found" });
    }

    const userAgentHeader = req.headers["user-agent"];
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(String(req.user?._id)),
      action: "UPDATE",
      entityType: "Branch",
      entityId: new mongoose.Types.ObjectId(id),
      before: serializeBranch(existingBranch as BranchDoc),
      after: serializeBranch(branch),
      ipAddress: req.ip,
      userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
      timestamp: new Date(),
    });

    return res.json({
      success: true,
      data: serializeBranch(branch),
    });
  } catch (error) {
    return fail(res, error, "Failed to update branch");
  }
});

// Delete branch (ADMIN only)
router.delete("/:id", requireRole("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, error: "Branch not found" });
    }

    await Branch.findByIdAndDelete(id);

    const userAgentHeader = req.headers["user-agent"];
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(String(req.user?._id)),
      action: "DELETE",
      entityType: "Branch",
      entityId: new mongoose.Types.ObjectId(id),
      before: serializeBranch(branch as BranchDoc),
      ipAddress: req.ip,
      userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
      timestamp: new Date(),
    });

    return res.json({ success: true, data: { _id: id } });
  } catch (error) {
    return fail(res, error, "Failed to delete branch");
  }
});

export default router;
