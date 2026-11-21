import { Router } from "express";
import Product from "../models/Product.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { protect, allowRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { list, getOne, create, update, remove } from "../controllers/resource.controller.js";
import { productSchema, optionalFields } from "../validators/requestSchemas.js";
import { validateProductWarehouses } from "../middleware/validateProductWarehouses.js";

const router = Router();

const hasProductReferences = async (productId) => {
  const [purchaseOrderReference, productWithStock] = await Promise.all([
    PurchaseOrder.exists({ "items.product": productId }),
    Product.exists({
      _id: productId,
      "stockByWarehouse.quantity": { $gt: 0 }
    })
  ]);

  return Boolean(purchaseOrderReference || productWithStock);
};

router.use(protect);
router.get("/", list(Product));
router.get("/:id", getOne(Product));
router.post("/", allowRoles("ADMIN", "WAREHOUSE_MANAGER"), validateBody(productSchema), validateProductWarehouses, create(Product));
router.patch("/:id", allowRoles("ADMIN", "WAREHOUSE_MANAGER"), validateBody(optionalFields(productSchema), { requireAtLeastOne:true }), validateProductWarehouses, update(Product));
router.delete("/:id", allowRoles("ADMIN"), remove(Product, hasProductReferences));

export default router;
