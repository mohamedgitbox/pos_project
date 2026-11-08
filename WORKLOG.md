# WORKLOG.md — Multi-Branch POS & Inventory Management System

> Living handoff document for future sessions.  
> Last updated: 2026-11-07.

## 1. Project Overview & GitHub Link

- **GitHub repository:** https://github.com/mohamedgitbox/pos_project
- **Local project root:** `/home/abo-alkassem/uni/pos_project`
- **What this project is:** A multi-branch Point of Sale (POS) and Inventory Management system built on a MERN stack.
- **Current delivery status:**
  - Milestone 1 (Foundation) is complete.
  - Milestone 2 (Products & Inventory Management) is complete.
  - Milestone 3 (POS checkout) is complete.
  - Milestone 3.5 (Adjust Stock) is complete.
  - Milestone 4 (Purchase Orders with weighted-average cost) is complete.
  - Milestone 5 (Stock Transfers between branches) is complete.
- **Immediate next milestone:** Milestone 6 — Reports & Dashboard.

## 2. Tech Stack

### Backend
- **Runtime:** Node.js v24.14.1
- **Framework:** Express 4.x
- **Language:** TypeScript in strict mode
- **ODM / Database:** Mongoose 8 with MongoDB 7
- **Validation:** Zod on request bodies and params
- **Auth:** JWT stored in an httpOnly cookie, verified by `server/src/middleware/auth.ts`
- **Password hashing:** `bcrypt` is used by the current auth/seed implementation
- **Cookies / CORS:** `cookie-parser` and `cors` with credentials enabled
- **Money math:** `decimal.js`
- **Dev runner:** `tsx watch`
- **Tests:** `vitest` is present as a dev dependency, but no meaningful test suite has been implemented yet

### Frontend
- **Framework:** React 18
- **Build tool:** Vite
- **Language:** TypeScript in strict mode
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **HTTP client:** Axios with `withCredentials: true`
- **Notifications:** `react-hot-toast`
- **Icons:** `lucide-react`
- **Charts:** `recharts` is installed, but dashboard/reporting screens are still mostly placeholders

### Workspace & Infrastructure
- **Package manager:** pnpm 12.18.0 workspaces
- **Database infrastructure:** Docker Compose running `mongo:7`
- **Replica set:** MongoDB is started with `--replSet rs0` so Mongoose transactions work
- **Bootstrap scripts:** root `package.json` exposes DB up/down/seed and parallel dev/typecheck scripts

## 3. Project Structure

```text
pos_project/
├── package.json                 # pnpm workspace root scripts
├── docker-compose.yml           # MongoDB 7 replica-set service
├── ENV_CHECK.md
├── PLAN.md
├── WORKLOG.md
├── server/                      # Express + TypeScript API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── src/
│       ├── index.ts             # HTTP server bootstrap
│       ├── app.ts               # Express app, CORS, cookie parser, route mounting
│       ├── seed.ts              # Seeds branches, users, products, inventory, counters
│       ├── config/
│       │   └── db.ts            # Mongoose connection
│       ├── models/              # Mongoose schemas and model exports
│       ├── middleware/
│       │   ├── auth.ts          # JWT cookie auth + req.user augmentation
│       │   ├── rbac.ts          # requireRole(...)
│       │   └── audit.ts         # Audit helper middleware
│       ├── services/
│       │   ├── inventoryService.ts # decrementStock, incrementStock, cost helpers
│       │   └── counterService.ts   # Atomic sequence generator for INV/PO/TR numbers
│       └── routes/
│           ├── auth.ts
│           ├── products.ts
│           ├── sales.ts
│           ├── purchaseOrders.ts
│           └── branches.ts
└── client/                      # React + Vite + TypeScript SPA
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── .env
    └── src/
        ├── main.tsx
        ├── App.tsx              # Router, AuthProvider, Toaster
        ├── lib/
        │   └── api.ts           # Axios instance with withCredentials + 401 guard
        ├── context/
        │   └── AuthContext.tsx  # login/logout/fetchUser/hasRole
        ├── components/
        │   ├── Layout.tsx       # Sidebar + header + role-based links
        │   └── ProtectedRoute.tsx
        └── pages/
            ├── Login.tsx
            ├── Dashboard.tsx
            ├── Products.tsx
            ├── Pos.tsx
            ├── PurchaseOrders.tsx
            ├── PurchaseOrderForm.tsx
            └── PurchaseOrderDetail.tsx
```

Mounted backend routes:

- `/api/v1/auth`
- `/api/v1/products`
- `/api/v1/sales`
- `/api/v1/purchase-orders`
- `/api/v1/transfers`
- `/api/v1/branches`
- `/api/v1/health`

## 4. Completed Milestones Summary

### M1 — Foundation

- pnpm workspace with `server/` and `client/`.
- Docker Compose MongoDB with `--replSet rs0`.
- Mongoose models for core domain collections.
- Auth flow fixed for localhost:
  - httpOnly JWT cookie.
  - `secure: false` on localhost HTTP.
  - `sameSite: 'lax'`.
  - `path: '/'`.
  - `maxAge: 7 days`.
  - CORS credentials enabled.
  - Axios `withCredentials: true`.
- RBAC middleware for `ADMIN`, `MANAGER`, `CASHIER`.
- Audit log model and middleware/helper usage.
- Seed script:
  - 3 branches.
  - 3 users.
  - 25 products.
  - Inventory records for all product/branch combinations.
  - Counters for invoice, PO, and transfer numbers.
- React shell:
  - Login page.
  - Auth context.
  - Protected routes.
  - Role-based sidebar/layout.

### M2 — Products & Inventory Management

- Backend `server/src/routes/products.ts`.
- Product CRUD:
  - `GET /api/v1/products`
  - `POST /api/v1/products`
  - `PUT /api/v1/products/:id`
  - `DELETE /api/v1/products/:id`
- Product list includes aggregated `totalStock` from `Inventory`.
- Creating a product also creates initial inventory rows for every branch:
  - `quantity: 0`
  - `minLevel: 10`
- Duplicate SKU handling returns `409`.
- Frontend `client/src/pages/Products.tsx`.
- Tailwind table with product name, SKU, cost price, selling price, stock, and actions.
- Add Product modal/form.
- Delete product action.
- Route `/products` added to React Router.

### M3 — POS Checkout

- Backend `server/src/routes/sales.ts`.
- Checkout endpoint:
  - `POST /api/v1/sales`
- Request shape:

```ts
{
  branchId: string,
  items: Array<{
    productId: string,
    quantity: number,
    price: number
  }>
}
```

- Checkout runs inside `session.withTransaction()`.
- Transaction steps:
  1. Generate invoice number via `Counter`.
  2. Atomically decrement stock for each item.
  3. Create `Sale`.
  4. Create `SaleItem` documents.
  5. Create `AuditLog` entry with action `CHECKOUT`.
- Insufficient stock rolls back and returns `409`.
- Added `GET /api/v1/sales/branches` for branch selection.
- Frontend `client/src/pages/Pos.tsx`.
- Split POS layout:
  - Product search/grid on the left.
  - Cart and receipt panel on the right.
- Cart supports add, increment, decrement, remove, and total calculation.
- Checkout posts to `/api/v1/sales`.
- Success clears cart and shows receipt placeholder.
- Errors display backend message, e.g. insufficient stock.
- `react-hot-toast` Toaster added in `App.tsx`.
- Sidebar POS link added for allowed roles.

### M3.5 — Adjust Stock

- Added backend endpoint:

```http
POST /api/v1/products/:id/adjust-stock
```

- Restricted to `ADMIN` and `MANAGER`.
- Zod validation:

```ts
{
  branchId: string,
  quantity: number,
  type: "ADD" | "REMOVE" | "SET"
}
```

- Behavior:
  - `SET`: sets branch inventory quantity directly.
  - `ADD`: increments quantity.
  - `REMOVE`: decrements quantity only if final quantity would remain `>= 0`.
- Insufficient removal returns:

```text
400 Insufficient stock for this adjustment
```

- Creates `AuditLog` entry with action `INVENTORY_ADJUST`.
- Frontend Products page gained:
  - Branch dropdown.
  - New quantity input.
  - Adjust Stock modal.
  - Toast feedback.
  - Product list refresh after save.

### M4 — Purchase Orders

- Backend `server/src/routes/purchaseOrders.ts`.
- Endpoints:
  - `GET /api/v1/purchase-orders`
  - `POST /api/v1/purchase-orders`
  - `GET /api/v1/purchase-orders/:id`
  - `PUT /api/v1/purchase-orders/:id/status`
  - `DELETE /api/v1/purchase-orders/:id`
- Added generic branch endpoint:
  - `GET /api/v1/branches`
- PO creation:
  - Starts as `DRAFT`.
  - Generates sequential PO number, e.g. `PO-000001`.
  - Validates supplier, branch, products, quantities, and unit costs.
  - Calculates total cost using `decimal.js`.
  - Creates `PurchaseOrder`, `PurchaseItem`, and `PO_CREATED` audit entry inside a transaction.
- Status transitions:

```text
DRAFT -> ORDERED
DRAFT -> CANCELLED
ORDERED -> RECEIVED
ORDERED -> CANCELLED
```

- Invalid transitions return `400`.
- Receiving a PO:
  - Runs inside `session.withTransaction()`.
  - Aggregates duplicate product lines in the same PO.
  - Increments branch inventory using `incrementStock`.
  - Recalculates product `costPrice` using weighted-average cost.
  - Updates PO status to `RECEIVED`.
  - Writes `PO_RECEIVED` audit entry.
- Deleting a PO:
  - Allowed only for `DRAFT` or `CANCELLED`.
  - Deletes related `PurchaseItem` records.
  - Writes `PO_DELETED` audit entry.
- Frontend pages:
  - `PurchaseOrders.tsx`: list with status badges and Create PO button.
  - `PurchaseOrderForm.tsx`: dynamic item rows, product/branch dropdowns, subtotal and total calculation.
  - `PurchaseOrderDetail.tsx`: PO metadata, item table, Mark as Ordered, Receive confirmation modal.
- Routes added:
  - `/purchase-orders`
  - `/purchase-orders/new`
  - `/purchase-orders/:id`
- Sidebar Purchases link now points to `/purchase-orders`.

### M5 — Stock Transfers

- Backend routes/controllers:
  - `server/src/routes/transfers.ts`
  - `server/src/controllers/transferQueryController.ts`
  - `server/src/controllers/transferCreateController.ts`
  - `server/src/controllers/transferStatusController.ts`
- Endpoints:
  - `GET /api/v1/transfers`
  - `GET /api/v1/transfers/branch-stock/:branchId`
  - `GET /api/v1/transfers/:id`
  - `POST /api/v1/transfers`
  - `PUT /api/v1/transfers/:id/status`
- Workflow:
  - Create starts `PENDING` and validates source stock without reserving it.
  - `SHIP` transitions `PENDING -> IN_TRANSIT` and decrements source branch stock atomically.
  - `RECEIVE` transitions `IN_TRANSIT -> RECEIVED` and increments destination branch stock atomically.
  - `CANCEL` transitions `PENDING -> CANCELLED` without moving stock.
- Concurrency:
  - Create, ship, receive, and cancel run inside `session.withTransaction()`.
  - Shipping uses existing `decrementStock()` with `$gte` guard to prevent negative stock races.
- RBAC and branch scoping:
  - Only ADMIN/MANAGER can access transfer APIs and screens.
  - Non-admin users can only create/ship/cancel from their assigned source branch and receive at their assigned destination branch.
- Frontend pages:
  - `Transfers.tsx`: list with status filter and create button.
  - `TransferForm.tsx`: source/destination branch selection, source branch stock loading, dynamic item rows, client-side quantity validation.
  - `TransferDetail.tsx`: transfer metadata, item table, Ship/Receive/Cancel actions with confirmation.
- Routes added:
  - `/transfers`
  - `/transfers/new`
  - `/transfers/:id`
- Seed now clears `StockTransfer` and `TransferItem` records.

## 5. Key Architecture Decisions

- **Transactions:** POS checkout and PO receive use `session.withTransaction()`; MongoDB replica set (`rs0`) is required.
- **Stock safety:** `decrementStock()` uses conditional `quantity: { $gte: qty }`; `incrementStock()` upserts branch inventory.
- **Money math:** `decimal.js` for totals/subtotals/weighted average; MongoDB stores prices as `Decimal128`.
- **Weighted-average cost:** On PO receive: `newAvgCost = ((oldCost * oldQty) + receivedTotalCost) / (oldQty + receivedQty)`, stored to 4 decimals.
- **Auth:** JWT in httpOnly cookie named `token`; local dev cookie has `secure:false`, `sameSite:'lax'`, `path:'/'`, 7-day max age.
- **CORS:** Backend allows `CLIENT_URL` (default `http://localhost:5173`) with credentials; `cookieParser()` and `express.json()` are mounted before routes.
- **Client HTTP:** Axios uses `withCredentials:true`; 401 redirects to `/login` only when not already there to avoid loops.
- **RBAC:** Server-side `requireRole(...)`; product/PO management is ADMIN/MANAGER; checkout allows ADMIN/MANAGER/CASHIER.
- **Branch scoping:** Non-admin users are restricted to assigned branch for sales/POs/transfers where applicable; admin may select branch in POS and transfers.
- **Audit logging:** Critical mutations write AuditLog entries: CHECKOUT, INVENTORY_ADJUST, PO_CREATED/ORDERED/RECEIVED/CANCELLED/DELETED, TRANSFER_CREATED/SHIP/RECEIVE/CANCELLED.
- **Counters:** Atomic `Counter.findOneAndUpdate($inc)` generates `INV-000001`, `PO-000001`, `TR-000001`.
- **Validation:** Zod validates IDs, required fields, numeric quantities/prices, and status transitions.
- **API envelope:** Success `{ success:true, data }`; failure `{ success:false, error, details? }`.
- **Current deviations:** Older plan mentions argon2/shadcn/SSE; implemented code currently uses bcrypt, plain Tailwind components, and SSE is not wired yet.

## 6. Default Credentials

| Role | Email | Password | Branch |
|---|---|---|---|
| ADMIN | `admin@pos.com` | `Admin123!` | No assigned branch |
| MANAGER | `manager@pos.com` | `Manager123!` | Main Branch |
| CASHIER | `cashier@pos.com` | `Cashier123!` | Main Branch |

Notes:

- Admin has no branch, so POS shows branch selector.
- Manager/cashier are branch-scoped.
- Password hashing is bcrypt in current auth/seed code.

## 7. Essential Commands

From the project root:

```bash
cd /home/abo-alkassem/uni/pos_project
pnpm install
```

Start MongoDB replica set:

```bash
pnpm db:up
```

Stop MongoDB:

```bash
pnpm db:down
```

Seed database:

```bash
pnpm db:seed
```

Run backend and frontend together:

```bash
pnpm dev
```

Run backend only:

```bash
cd /home/abo-alkassem/uni/pos_project/server
pnpm dev
```

Run frontend only:

```bash
cd /home/abo-alkassem/uni/pos_project/client
pnpm dev
```

Typecheck backend:

```bash
cd /home/abo-alkassem/uni/pos_project/server
pnpm typecheck
```

Typecheck frontend:

```bash
cd /home/abo-alkassem/uni/pos_project/client
pnpm typecheck
```

Typecheck both from root:

```bash
cd /home/abo-alkassem/uni/pos_project
pnpm typecheck
```

Important local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- API base used by client: `http://localhost:4000/api/v1`

## 8. Current Known Gaps / Next Session Notes

- Milestone 6 should implement Reports & Dashboard analytics.
- SSE/change-stream real-time updates are planned but not implemented yet.
- Users and Branches CRUD pages are not fully implemented yet.
- Audit Log viewer is not implemented yet.
- Security & Data Integrity Patch has been applied.
- Batch 2 of fixes has been applied:
  - POS Stock Display: Now shows branch-specific stock.
  - Dashboard: Uses real data from `/api/v1/reports/dashboard`.
  - RBAC on Frontend Routes: Applied role-based access control.
  - Rate Limiting & Helmet: Added security headers and rate limiting for login.
  - Audit Middleware: Sanitizes sensitive fields (password, token, secret).
  - Weighted-Average Cost Calculation: Consolidated into `inventoryService.ts`.
- Before testing purchases/POS, ensure MongoDB replica set is running and seeded.
- Newly created products start with branch inventory quantity `0`; use Adjust Stock or receive a PO before selling them.