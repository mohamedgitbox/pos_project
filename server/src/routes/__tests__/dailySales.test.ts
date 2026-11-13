// MUST be set before any import that opens the mongoose connection.
process.env.TZ = "UTC";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pos_project_test";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "node:path";
import type { Server } from "node:http";

// Load JWT_SECRET from the server .env (test DB URI / TZ already forced above).
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Real constant — dotenv loaded above (static imports hoisted by ESBuild, so we
// load the app lazily in beforeAll instead of at the top).
const JWT_SECRET = process.env.JWT_SECRET as string;
const API = "/api/v1/reports/daily-sales";

let app: any;

// Static imports for models (needed at describe time, so we keep them here;
// the app itself is imported lazily in beforeAll to avoid hoisting issues).
import { Branch, User, Sale } from "../../models";

let server: Server;
let base = "";
let branch1: any, branch2: any, branch3: any;
let admin: any, manager: any, cashier: any;

const DAY = 86400000;
const utcMidnight = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const tokenFor = (u: any) =>
  jwt.sign(
    // Payload keys MUST match what auth.ts signs and authMiddleware decodes:
    // _id, name, email, role, branchId.
    { _id: u._id, name: u.name, email: u.email, role: u.role, branchId: u.branchId ?? null },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
const cookie = (u: any) => `token=${tokenFor(u)}`; // Cookie name per auth.ts: res.cookie("token", ...)
const get = (qs: string, u?: any) =>
  fetch(`${base}${API}${qs}`, { headers: u ? { Cookie: cookie(u) } : {} });

// Real Sale schema fields: branchId, totalAmount, timestamp; plus required
// userId (link to the user who made the sale) and invoiceNo.
const mkSale = (branchId: any, userId: any, amount: number, when: Date) => ({
  branchId,
  userId,
  invoiceNo: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  totalAmount: amount,
  timestamp: when,
});

beforeAll(async () => {
  app = (await import("../../app")).default;
  if (!JWT_SECRET) throw new Error("JWT_SECRET missing — check server/.env");
  await mongoose.connect(process.env.MONGODB_URI as string);
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([Branch.deleteMany({}), User.deleteMany({}), Sale.deleteMany({})]);
  [branch1, branch2, branch3] = await Branch.create([
    { name: "B1", type: "store", location: "L1", phone: "p1" },
    { name: "B2", type: "store", location: "L2", phone: "p2" },
    { name: "B3", type: "store", location: "L3", phone: "p3" },
  ]);
  // Real User schema fields: name, email, password, role, branchId.
  [admin, manager, cashier] = await User.create([
    { name: "Admin", email: "admin@test.local", password: "x", role: "ADMIN", branchId: null },
    { name: "Mgr", email: "mgr@test.local", password: "x", role: "MANAGER", branchId: branch1._id },
    { name: "Cash", email: "cash@test.local", password: "x", role: "CASHIER", branchId: branch1._id },
  ]);

  const today = utcMidnight(new Date());
  const at = (offsetDays: number, hour = 10) => new Date(today + offsetDays * DAY + hour * 3600000);

  await Sale.create([
    // branch1: 3 sales inside the 7d window on different days
    mkSale(branch1._id, manager._id, 100, at(0)),
    mkSale(branch1._id, manager._id, 200, at(-2)),
    mkSale(branch1._id, manager._id, 50, at(-5)),
    // branch2: 2 sales
    mkSale(branch2._id, cashier._id, 300, at(-1)),
    mkSale(branch2._id, cashier._id, 25, at(-3)),
    // branch3: 1 sale
    mkSale(branch3._id, cashier._id, 40, at(-4)),
    // outside the 7d window but inside 30d
    mkSale(branch1._id, manager._id, 999, at(-10)),
    // outside 30d entirely
    mkSale(branch2._id, cashier._id, 5000, at(-40)),
  ]);
});

type Row = { date: string; revenue: number; count: number };
const seriesOf = (body: any): Row[] => body.data as Row[];
const sumRevenue = (s: Row[]) => s.reduce((a, r) => a + Number(r.sales), 0);
const sumOrders = (s: Row[]) => s.reduce((a, r) => a + Number(r.count), 0);

describe("GET /api/v1/reports/daily-sales", () => {
  it("401 without auth", async () => {
    const res = await get("?dateRange=7d");
    expect(res.status).toBe(401);
  });

  it("400 on invalid dateRange", async () => {
    const res = await get("?dateRange=365d", admin);
    expect(res.status).toBe(400);
  });

  it("400 on invalid branchId (ADMIN)", async () => {
    const res = await get("?dateRange=7d&branchId=not-an-objectid", admin);
    expect(res.status).toBe(400);
  });

  it("ADMIN with branchId returns only that branch", async () => {
    const res = await get(`?dateRange=7d&branchId=${branch2._id}`, admin);
    expect(res.status).toBe(200);
    const s = seriesOf(await res.json());
    expect(sumRevenue(s)).toBe(325); // 300 + 25
    expect(sumOrders(s)).toBe(2);
  });

  it("ADMIN without branchId returns all branches", async () => {
    const res = await get("?dateRange=7d", admin);
    const s = seriesOf(await res.json());
    expect(sumRevenue(s)).toBe(715); // 100+200+50+300+25+40
    expect(sumOrders(s)).toBe(6);
  });

  it("MANAGER passing another branchId is forced to own branch", async () => {
    const res = await get(`?dateRange=7d&branchId=${branch2._id}`, manager);
    const s = seriesOf(await res.json());
    expect(sumRevenue(s)).toBe(350); // branch1 only: 100+200+50
    expect(sumOrders(s)).toBe(3);
  });

  it("CASHIER passing another branchId is forced to own branch", async () => {
    const res = await get(`?dateRange=7d&branchId=${branch3._id}`, cashier);
    const s = seriesOf(await res.json());
    expect(sumRevenue(s)).toBe(350);
    expect(sumOrders(s)).toBe(3);
  });

  it("zero-fills missing days (7d => 8 rows, 30d => 31 rows)", async () => {
    const r7 = seriesOf(await (await get("?dateRange=7d", admin)).json());
    const r30 = seriesOf(await (await get("?dateRange=30d", admin)).json());
    expect(r7.length).toBe(8);
    expect(r30.length).toBe(31);
    for (let i = 1; i < r7.length; i++) {
      const prev = Date.parse(r7[i - 1].date);
      const cur = Date.parse(r7[i].date);
      expect(cur - prev).toBe(DAY);
    }
    expect(r7.some((r) => r.sales === 0 && r.count === 0)).toBe(true);
  });

  it("aggregation sums correctly and counts all sales (no status/refund field)", async () => {
    const s = seriesOf(await (await get("?dateRange=30d", admin)).json());
    // 30d includes the -10 sale (999) but excludes -40 (5000)
    expect(sumRevenue(s)).toBe(715 + 999);
    expect(sumOrders(s)).toBe(7);
  });

  it("dateRange boundaries: today vs 7d vs 30d", async () => {
    const today = seriesOf(await (await get("?dateRange=today", admin)).json());
    const d7 = seriesOf(await (await get("?dateRange=7d", admin)).json());
    const d30 = seriesOf(await (await get("?dateRange=30d", admin)).json());
    expect(sumRevenue(today)).toBe(100); // only the at(0) sale
    expect(sumOrders(today)).toBe(1);
    expect(sumRevenue(d7)).toBe(715);
    expect(sumRevenue(d30)).toBe(1714);
    expect(today.length).toBe(1);
    expect(d7.length).toBe(8);
    expect(d30.length).toBe(31);
  });
});
