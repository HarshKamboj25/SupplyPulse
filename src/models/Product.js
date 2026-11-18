import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  quantity: { type: Number, min: 0, default: 0 },
  binLocation: { type: String, trim: true }
}, { _id: false });

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  unitPrice: { type: Number, required: true, min: 0 },
  reorderThreshold: { type: Number, min: 0, default: 5 },
  stockByWarehouse: [stockSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ name: "text", sku: "text", category: "text" });

export default mongoose.model("Product", productSchema);
