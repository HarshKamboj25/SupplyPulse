import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Warehouse from "../models/Warehouse.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";

try {
  await connectDB();
  await Promise.all([User.deleteMany({}), Warehouse.deleteMany({}), Supplier.deleteMany({}), Product.deleteMany({})]);

  const passwordHash = await bcrypt.hash("Admin@12345", 12);
  await User.create({ name: "Demo Admin", email: "admin@supplypulse.dev", passwordHash, role: "ADMIN" });

  const [warehouse] = await Warehouse.create([{ code: "WH-DEL-01", name: "Delhi Central Warehouse", city: "Delhi", capacityUnits: 5000 }]);
  await Supplier.create([{ name: "NorthStar Supplies", email: "supplier@example.com", maxLeadDays: 5 }]);
  await Product.create([
    { sku: "KB-001", name: "Mechanical Keyboard", category: "Accessories", unitPrice: 2499, reorderThreshold: 10, stockByWarehouse: [{ warehouse: warehouse._id, quantity: 7, binLocation: "A-01" }] },
    { sku: "MS-001", name: "Wireless Mouse", category: "Accessories", unitPrice: 899, reorderThreshold: 15, stockByWarehouse: [{ warehouse: warehouse._id, quantity: 42, binLocation: "A-02" }] }
  ]);

  console.log("Seed complete. Demo admin: admin@supplypulse.dev / Admin@12345");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
