import { Router } from "express";
import Supplier from "../models/Supplier.js";
import { protect, allowRoles } from "../middleware/auth.js";
import { list, getOne, create, update, remove } from "../controllers/resource.controller.js";

const router = Router();
router.use(protect);
router.get("/", list(Supplier));
router.get("/:id", getOne(Supplier));
router.post("/", allowRoles(...["ADMIN", "PROCUREMENT_OFFICER"]), create(Supplier));
router.patch("/:id", allowRoles(...["ADMIN", "PROCUREMENT_OFFICER"]), update(Supplier));
router.delete("/:id", allowRoles("ADMIN"), remove(Supplier));
export default router;
