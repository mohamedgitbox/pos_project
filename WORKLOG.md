# WORKLOG.md — Multi-Branch POS & Inventory Management System

## 2026-11-07 — Project Initialization

### Environment Probe
- Node.js v24.14.1 (>=20 PASS)
- pnpm 12.18.0 (PASS)
- Docker Engine 29.5.2 + Compose v5.1.4 (PASS)
- No local mongod/mongosh → Decision: use Docker Compose mongo:7 with replica set
- Write permissions verified (PASS)
- Recorded in ENV_CHECK.md

### Architecture Decisions
- MongoDB via Docker Compose with --replSet rs0 for transaction support
- Single-node replica set initiated idempotently via pnpm db:up
- All money math uses decimal.js (no native floats)
- JWT auth in httpOnly cookies with argon2 hashing
- Zod validation on all request inputs
- SSE for real-time updates backed by MongoDB change streams
- pnpm workspaces for monorepo management
- React 18 + Vite + Tailwind CSS + shadcn/ui for frontend
- Express 4.x + TypeScript strict mode for backend

### Deviations from Brief
- None at this stage. All requirements being implemented as specified.