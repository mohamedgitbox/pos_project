import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { getBranchStock, getTransfer, listTransfers } from "../controllers/transferQueryController";
import { createTransfer } from "../controllers/transferCreateController";
import { updateTransferStatus } from "../controllers/transferStatusController";

const router = Router();

router.use(authMiddleware);

router.get("/", requireRole("ADMIN", "MANAGER"), listTransfers);
router.get("/branch-stock/:branchId", requireRole("ADMIN", "MANAGER"), getBranchStock);
router.get("/:id", requireRole("ADMIN", "MANAGER"), getTransfer);
router.post("/", requireRole("ADMIN", "MANAGER"), createTransfer);
router.put("/:id/status", requireRole("ADMIN", "MANAGER"), updateTransferStatus);

export default router;