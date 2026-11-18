import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { lowStock } from "../controllers/analytics.controller.js";

const router = Router();
router.use(protect);
router.get("/low-stock", lowStock);
export default router;
