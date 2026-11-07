import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuditLog } from "../models";

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
          after: req.body,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          timestamp: new Date(),
        }).catch(() => {});
      }
    });
    next();
  };
}
