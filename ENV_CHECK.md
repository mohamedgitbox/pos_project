# Environment & Capability Probe Results

| Check | Command | Result | Fallback Used |
|-------|---------|--------|---------------|
| Node.js >= 20 | `node -v` | v24.14.1 — PASS | None |
| pnpm | `pnpm -v` | 12.18.0 — PASS | None |
| Docker | `docker info` | Docker Engine 29.5.2 — PASS | None |
| Docker Compose | `docker compose version` | v5.1.4 — PASS | None |
| MongoDB availability | `which mongod`, `which mongosh` | Not installed locally | Option A: Docker compose service (mongo:7 with replica set) |
| Replica-set check | N/A | Will be initiated via `pnpm db:up` script | Single-node rs.initiate() in docker container |
| Write permissions | create/read/delete `.perm_test` | PERM_OK — PASS | None |

## Decisions
- **MongoDB strategy**: Option A — Docker Compose with `mongo:7` image, `--replSet rs0`, single-node replica set for transaction support.
- **No local mongod/mongosh**: All DB interactions go through Docker or Mongoose from the server app.
- **pnpm 12.18.0**: Exceeds minimum requirement of pnpm 9. No corepack activation needed.

</content>