import { Router } from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import { listOrders, createOrder, approveOrder, receiveOrder } from "../controllers/purchaseOrder.controller.js";

const router = Router();
router.use(protect);
router.get("/", listOrders);
router.post("/", allowRoles("ADMIN", "PROCUREMENT_OFFICER"), createOrder);
router.patch("/:id/approve", allowRoles("ADMIN"), approveOrder);
router.patch("/:id/receive", allowRoles("ADMIN", "WAREHOUSE_MANAGER"), receiveOrder);
export default router;
