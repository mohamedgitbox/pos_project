import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/auth";
import productRouter from "./routes/products";
import saleRouter from "./routes/sales";
import purchaseOrderRouter from "./routes/purchaseOrders";
import transferRouter from "./routes/transfers";
import branchRouter from "./routes/branches";
import userRouter from "./routes/users";
import inventoryRouter from "./routes/inventory";
import reportRouter from "./routes/reports";
import auditLogRouter from "./routes/auditLog";

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: { success: false, error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// Apply rate limiting to login endpoint
app.use("/api/v1/auth/login", loginLimiter);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/sales", saleRouter);
app.use("/api/v1/purchase-orders", purchaseOrderRouter);
app.use("/api/v1/transfers", transferRouter);
app.use("/api/v1/branches", branchRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/audit-log", auditLogRouter);

app.get("/api/v1/health", (_req, res) => {
  res.json({ success: true, status: "ok" });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

export default app;
