import { Router, Request, Response } from "express";
import { z, ZodError } from "zod";
import mongoose from "mongoose";
import { AuditLog } from "../models";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const listQuerySchema = z.object({
  action: z.string().optional(),
  entityType: z.string().optional(),
  userId: idSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

function fail(res: Response, error: unknown, fallback: string): Response {
  if (error instanceof ZodError) {
    return res.status(400).json({ success: false, error: "Validation failed", details: error.issues });
  }
  console.error(error);
  return res.status(500).json({ success: false, error: fallback });
}

interface AuditLogDoc {
  _id: unknown;
  userId: unknown;
  action: string;
  entityType: string;
  entityId: unknown;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

function toIdString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    const obj = value as { _id?: unknown };
    return obj._id ? String(obj._id) : null;
  }
  return String(value);
}

function serializeAuditLog(log: AuditLogDoc): Record<string, unknown> {
  return {
    _id: String(log._id),
    userId: toIdString(log.userId),
    action: log.action,
    entityType: log.entityType,
    entityId: toIdString(log.entityId),
    before: log.before,
    after: log.after,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    timestamp: log.timestamp.toISOString(),
  };
}

router.use(authMiddleware);

// List audit logs (ADMIN only)
router.get("/", requireRole("ADMIN"), async (req: Request, res: Response) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const pageNum = query.page ? Number(query.page) : 1;
    const limitNum = query.limit ? Number(query.limit) : 20;

    const filter: Record<string, unknown> = {};

    if (query.action) filter.action = query.action;
    if (query.entityType) filter.entityType = query.entityType;
    if (query.userId) filter.userId = new mongoose.Types.ObjectId(query.userId);

    if (query.startDate || query.endDate) {
      const timestampFilter: Record<string, Date> = {};
      if (query.startDate) timestampFilter.$gte = new Date(query.startDate);
      if (query.endDate) timestampFilter.$lte = new Date(query.endDate);
      filter.timestamp = timestampFilter;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("userId", "name email role")
        .sort({ timestamp: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    interface PopulatedAuditLog extends AuditLogDoc {
      userId: { _id: unknown; name: string; email: string; role: string };
    }

    const formattedLogs = logs.map((log) => {
      const populatedLog = log as unknown as PopulatedAuditLog;
      return {
        ...serializeAuditLog(populatedLog),
        user: populatedLog.userId ? { _id: String(populatedLog.userId._id), name: populatedLog.userId.name, email: populatedLog.userId.email, role: populatedLog.userId.role } : null,
      };
    });

    return res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return fail(res, error, "Failed to load audit logs");
  }
});

// Get single audit log entry (ADMIN only)
router.get("/:id", requireRole("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: idSchema }).parse(req.params);

    interface PopulatedAuditLogSingle extends AuditLogDoc {
      userId: { _id: unknown; name: string; email: string; role: string };
    }

    const log = (await AuditLog.findById(id)
      .populate("userId", "name email role")
      .lean()) as unknown as PopulatedAuditLogSingle | null;

    if (!log) {
      return res.status(404).json({ success: false, error: "Audit log not found" });
    }

    const formattedLog = {
      ...serializeAuditLog(log),
      user: log.userId ? { _id: String(log.userId._id), name: log.userId.name, email: log.userId.email, role: log.userId.role } : null,
    };

    return res.json({ success: true, data: formattedLog });
  } catch (error) {
    return fail(res, error, "Failed to load audit log");
  }
});

export default router;
