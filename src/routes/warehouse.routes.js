import { Router } from "express";
import Warehouse from "../models/Warehouse.js";
import { protect, allowRoles } from "../middleware/auth.js";
import { list, getOne, create, update, remove } from "../controllers/resource.controller.js";

const router = Router();
router.use(protect);
router.get("/", list(Warehouse));
router.get("/:id", getOne(Warehouse));
router.post("/", allowRoles(...["ADMIN"]), create(Warehouse));
router.patch("/:id", allowRoles(...["ADMIN"]), update(Warehouse));
router.delete("/:id", allowRoles("ADMIN"), remove(Warehouse));
export default router;
