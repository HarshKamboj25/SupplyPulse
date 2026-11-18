import { Router } from "express";
import authRoutes from "./auth.routes.js";
import productRoutes from "./product.routes.js";
import warehouseRoutes from "./warehouse.routes.js";
import supplierRoutes from "./supplier.routes.js";
import purchaseOrderRoutes from "./purchaseOrder.routes.js";
import analyticsRoutes from "./analytics.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, status: "healthy", service: "SupplyPulse" });
});

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/purchase-orders", purchaseOrderRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
