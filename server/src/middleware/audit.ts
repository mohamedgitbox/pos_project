import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuditLog } from "../models";

function sanitizeBody(body: unknown): unknown {
  if (typeof body !== "object" || body === null) {
    return body;
  }

  const sanitized = { ...(body as Record<string, unknown>) };
  const sensitiveFields = ["password", "token", "secret"];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }

  return sanitized;
}

export function auditLog(action: string, entityType: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || req.body?._id || req.body?.id;
        AuditLog.create({
          userId: req.user?._id,
          action,
          entityType,
          entityId,
          before: undefined,
          after: sanitizeBody(req.body),
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          timestamp: new Date(),
        }).catch(() => {});
      }
    });
    next();
  };
}
