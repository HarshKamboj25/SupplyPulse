import { Router } from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { purchaseOrderSchema } from "../validators/requestSchemas.js";
import {
  listOrders,
  getOrder,
  createOrder,
  approveOrder,
  receiveOrder
} from "../controllers/purchaseOrder.controller.js";

const router = Router();

router.use(protect);

router.get("/", listOrders);
router.get("/:id", getOrder);

router.post(
  "/",
  allowRoles("ADMIN", "PROCUREMENT_OFFICER"),
  validateBody(purchaseOrderSchema),
  createOrder
);

router.patch("/:id/approve", allowRoles("ADMIN"), approveOrder);
router.patch("/:id/receive", allowRoles("ADMIN", "WAREHOUSE_MANAGER"), receiveOrder);

export default router;
