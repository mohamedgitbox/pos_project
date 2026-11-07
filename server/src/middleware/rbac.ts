import { Request, Response, NextFunction, RequestHandler } from "express";

type Role = "ADMIN" | "MANAGER" | "CASHIER";

export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }
    next();
  };
}
