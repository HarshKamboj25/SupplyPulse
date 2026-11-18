import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  capacityUnits: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Warehouse", warehouseSchema);
