import { Router } from "express";
import Warehouse from "../models/Warehouse.js";
import Product from "../models/Product.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { protect, allowRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { list, getOne, create, update, remove } from "../controllers/resource.controller.js";
import { warehouseSchema, optionalFields } from "../validators/requestSchemas.js";

const router = Router();

const hasWarehouseReferences = async (warehouseId) => {
  const [productReference, purchaseOrderReference] = await Promise.all([
    Product.exists({ "stockByWarehouse.warehouse": warehouseId }),
    PurchaseOrder.exists({ warehouse: warehouseId })
  ]);

  return Boolean(productReference || purchaseOrderReference);
};

router.use(protect);
router.get("/", list(Warehouse));
router.get("/:id", getOne(Warehouse));
router.post("/", allowRoles("ADMIN"), validateBody(warehouseSchema), create(Warehouse));
router.patch("/:id", allowRoles("ADMIN"), validateBody(optionalFields(warehouseSchema), { requireAtLeastOne: true }), update(Warehouse));
router.delete("/:id", allowRoles("ADMIN"), remove(Warehouse, hasWarehouseReferences));

export default router;
