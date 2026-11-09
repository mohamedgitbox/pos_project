import { Router, Request, Response } from "express";
import { z, ZodError } from "zod";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User, Branch, AuditLog } from "../models";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"]),
  branchId: idSchema.nullable().optional(),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"]).optional(),
  branchId: idSchema.nullable().optional(),
});

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

function fail(res: Response, error: unknown, fallback: string): Response {
  if (error instanceof ZodError) {
    return res.status(400).json({ success: false, error: "Validation failed", details: error.issues });
  }
  if (isDuplicate(error)) {
    return res.status(409).json({ success: false, error: "Email already exists" });
  }
  console.error(error);
  return res.status(500).json({ success: false, error: fallback });
}

interface UserDoc {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  branchId: unknown | null;
  createdAt?: Date;
}

function serializeUser(user: UserDoc): Record<string, unknown> {
  const b = user.branchId as unknown;
  const branchId =
    !b ? null
    : typeof b === "object" && b !== null && "_id" in (b as Record<string, unknown>)
      ? String((b as { _id: unknown })._id)
      : String(b);

  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    branchId,
    createdAt: user.createdAt?.toISOString(),
  };
}

router.use(authMiddleware);

// List all users (ADMIN only)
router.get("/", requireRole("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const users = (await User.find()
      .select("_id name email role branchId createdAt")
      .populate("branchId", "name")
      .sort({ createdAt: -1 })
      .lean()) as unknown as UserDoc[];

    return res.json({
      success: true,
      data: users.map((user) => ({
        ...serializeUser(user),
        branchName: (user as { branchId?: { name?: string } }).branchId?.name || null,
      })),
    });
  } catch (error) {
    return fail(res, error, "Failed to load users");
  }
});

// Create user (ADMIN only)
router.post("/", requireRole("ADMIN"), async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);

    if (data.branchId) {
      if (!(await Branch.exists({ _id: data.branchId }))) {
        return res.status(404).json({ success: false, error: "Branch not found" });
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      branchId: data.branchId || null,
    });

    const userAgentHeader = req.headers["user-agent"];
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(String(req.user?._id)),
      action: "CREATE",
      entityType: "User",
      entityId: user._id as mongoose.Types.ObjectId,
      after: { name: data.name, email: data.email, role: data.role, branchId: data.branchId },
      ipAddress: req.ip,
      userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
      timestamp: new Date(),
    });

    return res.status(201).json({
      success: true,
      data: serializeUser(user as unknown as UserDoc),
    });
  } catch (error) {
    return fail(res, error, "Failed to create user");
  }
});

// Get single user (ADMIN only)
router.get("/:id", requireRole("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);

    const user = (await User.findById(id)
      .select("_id name email role branchId createdAt")
      .populate("branchId", "name")
      .lean()) as unknown as UserDoc | null;

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({
      success: true,
      data: {
        ...serializeUser(user),
        branchName: (user as { branchId?: { name?: string } }).branchId?.name || null,
      },
    });
  } catch (error) {
    return fail(res, error, "Failed to load user");
  }
});

// Update user (ADMIN only)
router.put("/:id", requireRole("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);
    const data = updateUserSchema.parse(req.body);

    if (data.branchId !== undefined) {
      if (data.branchId) {
        if (!(await Branch.exists({ _id: data.branchId }))) {
          return res.status(404).json({ success: false, error: "Branch not found" });
        }
      }
    }

    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.branchId !== undefined) updateData.branchId = data.branchId || null;
    if (data.password !== undefined) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = (await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .select("_id name email role branchId createdAt")
      .lean()) as unknown as UserDoc | null;

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const userAgentHeader = req.headers["user-agent"];
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(String(req.user?._id)),
      action: "UPDATE",
      entityType: "User",
      entityId: new mongoose.Types.ObjectId(id),
      before: serializeUser(existingUser as unknown as UserDoc),
      after: serializeUser(user),
      ipAddress: req.ip,
      userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
      timestamp: new Date(),
    });

    return res.json({
      success: true,
      data: serializeUser(user),
    });
  } catch (error) {
    return fail(res, error, "Failed to update user");
  }
});

// Delete user (ADMIN only)
router.delete("/:id", requireRole("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    await User.findByIdAndDelete(id);

    const userAgentHeader = req.headers["user-agent"];
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(String(req.user?._id)),
      action: "DELETE",
      entityType: "User",
      entityId: new mongoose.Types.ObjectId(id),
      before: serializeUser(user as unknown as UserDoc),
      ipAddress: req.ip,
      userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
      timestamp: new Date(),
    });

    return res.json({ success: true, data: { _id: id } });
  } catch (error) {
    return fail(res, error, "Failed to delete user");
  }
});

export default router;

