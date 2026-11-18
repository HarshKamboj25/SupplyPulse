import { Router } from "express";
import Product from "../models/Product.js";
import { protect, allowRoles } from "../middleware/auth.js";
import { list, getOne, create, update, remove } from "../controllers/resource.controller.js";

const router = Router();
router.use(protect);
router.get("/", list(Product));
router.get("/:id", getOne(Product));
router.post("/", allowRoles(...["ADMIN", "WAREHOUSE_MANAGER"]), create(Product));
router.patch("/:id", allowRoles(...["ADMIN", "WAREHOUSE_MANAGER"]), update(Product));
router.delete("/:id", allowRoles("ADMIN"), remove(Product));
export default router;
