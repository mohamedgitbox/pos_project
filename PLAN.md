# PLAN.md - Multi-Branch POS & Inventory Management System

## Architecture Overview

### Tech Stack
- **Backend**: Node.js 24 + Express 4.x + TypeScript (strict) + Mongoose 8
- **Frontend**: React 18 + Vite 5+ + TypeScript (strict) + React Router v6 + Tailwind CSS + shadcn/ui + Recharts
- **Database**: MongoDB 7 via Docker Compose (single-node replica set `rs0`)
- **Auth**: JWT in httpOnly Secure cookies + argon2 password hashing
- **Validation**: Zod on all request inputs
- **Real-time**: SSE with MongoDB change streams (replica set available)
- **Package Manager**: pnpm workspaces
- **Money Math**: decimal.js everywhere (no native floats)

### Folder Structure
```
project-root/
├── client/                    # React SPA (Vite)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API call modules (axios)
│   │   ├── context/           # Auth context + reducers
│   │   ├── utils/             # Formatting, constants
│   │   ├── lib/               # shadcn/ui utilities
│   │   ├── App.tsx            # Root component + router
│   │   └── main.tsx           # Entry point
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                    # Express API
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # Express routers
│   │   ├── middleware/         # Auth, RBAC, audit, error handling
│   │   ├── services/          # Business logic (inventory, checkout, etc.)
│   │   ├── utils/             # Helpers (decimal, counters, etc.)
│   │   ├── validators/        # Zod schemas
│   │   ├── sse/               # Server-Sent Events manager
│   │   ├── app.ts             # Express app setup
│   │   └── server.ts          # Entry point
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.yml
├── pnpm-workspace.yaml
├── .env.example
├── .env
├── package.json               # Root workspace scripts
├── ENV_CHECK.md
├── WORKLOG.md
├── PLAN.md
└── README.md
```

## Data Model (10 Core Collections + Auxiliary)
All per spec. Exact fields, types, indexes, and constraints as specified in the project brief section 3.

### Concurrency Strategy
1. **Atomic conditional updates**: `findOneAndUpdate` with `$gte` guard on quantity
2. **Multi-document transactions**: `session.withTransaction()` for checkout, PO receive, transfer ship/receive
3. **Schema validator**: `$jsonSchema` enforcing `quantity >= 0` on INVENTORY collection
4. **Idempotency**: `Idempotency-Key` header stored in SALE.idempotencyKey unique sparse index
5. **Counters**: Atomic `findOneAndUpdate` with `$inc` for document numbers
6. **Deterministic lock ordering**: Sort items by productId before processing in transactions

## Milestones

### M1 - Foundation (Current)
- Scaffold pnpm workspace, server/, client/
- Docker Compose with MongoDB 7 replica set
- All 10 Mongoose schemas + indexes + validators + auxiliary collections
- Auth: login/logout/session with JWT httpOnly cookies + argon2
- RBAC middleware (ADMIN/MANAGER/CASHIER)
- Audit log middleware
- Seed script (3 branches, users per role, 25+ products, inventory, 30+ days sales)
- db:up / db:down / db:seed scripts
- React app shell with sidebar navigation + React Router
- Auth context with useReducer
- Error handling + toast infrastructure
- ENV_CHECK.md

### M2 - Organization & Catalog
- CRUD: Branches, Users (admin only), Products
- Product search by name/SKU/barcode (text index)
- Cross-branch inventory matrix view
- Low-stock alerts (quantity <= minLevel)

### M3 - POS & Sales
- POS terminal page with barcode/SKU input
- Cart with per-branch stock validation
- Atomic checkout (sale + inventory decrement + sale_items + audit + SSE)
- Sales list with filters
- Invoice detail with printable receipt

### M4 - Purchases
- PO creation, status flow (DRAFT -> ORDERED -> RECEIVED | CANCELLED)
- Receiving: atomic inventory increment + weighted-average cost update
- PO list + detail views

### M5 - Stock Transfers
- Transfer creation, status flow (PENDING -> IN_TRANSIT -> RECEIVED | CANCELLED)
- Ship: atomic source decrement; Receive: atomic destination increment
- Cancel rules maintaining stock consistency
- MANAGER/ADMIN restriction on source branch

### M6 - Reports & Dashboard
- Dashboard KPIs (revenue, profit, orders, low-stock, per-branch charts)
- Reports: sales, profit, slow-moving, stock valuation, low-stock
- CSV export via aggregation pipelines
- Date-range + branch filters

### M7 - Control & Live View
- Audit-log viewer with filters
- Real-time SSE live feed of sales and stock events

### M8 - Polish & Docs
- Complete README with setup, architecture, demo credentials, API reference, permission matrix
- Final lint/typecheck/test/build pass
- Realistic seed data verification

## Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| Replica set not ready on first boot | Idempotent init script with retry loop |
| Transaction errors under load | Retry up to 3x on TransientTransactionError |
| Decimal precision loss | decimal.js for ALL money math, Decimal128 in schema |
| SSE connection drops | Auto-reconnect with EventSource, polling fallback |
| Port conflicts | Configurable via .env |

</content>