import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  maxLeadDays: { type: Number, min: 0, default: 7 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Supplier", supplierSchema);
