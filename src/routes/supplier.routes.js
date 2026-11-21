import { Router } from "express";
import Supplier from "../models/Supplier.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { protect, allowRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { list, getOne, create, update, remove } from "../controllers/resource.controller.js";
import { supplierSchema, optionalFields } from "../validators/requestSchemas.js";

const router = Router();

const hasSupplierReferences = (supplierId) =>
  PurchaseOrder.exists({ supplier: supplierId });

router.use(protect);
router.get("/", list(Supplier));
router.get("/:id", getOne(Supplier));
router.post("/", allowRoles("ADMIN", "PROCUREMENT_OFFICER"), validateBody(supplierSchema), create(Supplier));
router.patch("/:id", allowRoles("ADMIN", "PROCUREMENT_OFFICER"), validateBody(optionalFields(supplierSchema), { requireAtLeastOne: true }), update(Supplier));
router.delete("/:id", allowRoles("ADMIN"), remove(Supplier, hasSupplierReferences));

export default router;
