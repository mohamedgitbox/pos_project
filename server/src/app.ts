import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import productRouter from "./routes/products";
import saleRouter from "./routes/sales";
import purchaseOrderRouter from "./routes/purchaseOrders";
import branchRouter from "./routes/branches";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/sales", saleRouter);
app.use("/api/v1/purchase-orders", purchaseOrderRouter);
app.use("/api/v1/branches", branchRouter);

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
