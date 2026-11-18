import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const lowStock = asyncHandler(async (_req, res) => {
  const rows = await Product.aggregate([
    { $unwind: "$stockByWarehouse" },
    { $match: { $expr: { $lte: ["$stockByWarehouse.quantity", "$reorderThreshold"] } } },
    { $project: {
      sku: 1, name: 1, category: 1, reorderThreshold: 1,
      warehouse: "$stockByWarehouse.warehouse",
      quantity: "$stockByWarehouse.quantity"
    }},
    { $sort: { quantity: 1 } }
  ]);
  res.json({ success: true, count: rows.length, data: rows });
});
