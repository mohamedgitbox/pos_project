import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../models";
import { JWT_SECRET } from "../config/jwt";

interface TokenPayload {
  _id: string;
  email: string;
  role: string;
  branchId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: string };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token as string | undefined;

  if (!token) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.user = decoded as unknown as IUser & { _id: string };
    next();
  } catch {
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.token as string | undefined;

  if (token) {
    try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      req.user = decoded as unknown as IUser & { _id: string };
    } catch {
      // ignore
    }
  }

  next();
}
