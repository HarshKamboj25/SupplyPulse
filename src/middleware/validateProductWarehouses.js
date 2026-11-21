import Warehouse from "../models/Warehouse.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const validateProductWarehouses = asyncHandler(async (req, _res, next) => {
  if (!Object.hasOwn(req.body, "stockByWarehouse")) {
    return next();
  }

  const stockEntries = req.body.stockByWarehouse;

  if (!Array.isArray(stockEntries) || stockEntries.length === 0) {
    return next();
  }

  const warehouseIds = [
    ...new Set(stockEntries.map((entry) => entry.warehouse.toString()))
  ];

  const warehouses = await Warehouse.find({
    _id: { $in: warehouseIds }
  }).select("_id isActive");

  if (warehouses.length !== warehouseIds.length) {
    throw new AppError("One or more warehouses were not found", 404);
  }

  if (warehouses.some((warehouse) => !warehouse.isActive)) {
    throw new AppError("One or more warehouses are inactive", 409);
  }

  next();
});
