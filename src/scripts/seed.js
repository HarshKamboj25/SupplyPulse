import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Warehouse from "../models/Warehouse.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";

export async function seedDatabase() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be configured.");
  }

  if (password.length < 16) {
    throw new Error("Seed admin password must contain at least 16 characters.");
  }

  let admin = await User.findOne({ email });

  if (admin) {
    if (admin.role !== "ADMIN") {
      throw new Error("Configured seed email already belongs to a non-admin user.");
    }
    console.log("Existing admin preserved.");
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      name: "Demo Admin",
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true
    });
    console.log("Seed admin created.");
  }

  const warehouse = await Warehouse.findOneAndUpdate(
    { code: "WH-DEL-01" },
    {
      $setOnInsert: {
        code: "WH-DEL-01",
        name: "Delhi Central Warehouse",
        city: "Delhi",
        capacityUnits: 5000
      }
    },
    { upsert: true, new: true, runValidators: true }
  );

  let supplier = await Supplier.findOne({
    email: "supplier@example.com"
  });

  if (!supplier) {
    supplier = await Supplier.create({
      name: "NorthStar Supplies",
      email: "supplier@example.com",
      maxLeadDays: 5
    });
    console.log("Demo supplier created.");
  } else {
    console.log("Existing supplier preserved.");
  }

  const products = [
    {
      sku: "KB-001",
      name: "Mechanical Keyboard",
      category: "Accessories",
      unitPrice: 2499,
      reorderThreshold: 10,
      stockByWarehouse: [
        { warehouse: warehouse._id, quantity: 7, binLocation: "A-01" }
      ]
    },
    {
      sku: "MS-001",
      name: "Wireless Mouse",
      category: "Accessories",
      unitPrice: 899,
      reorderThreshold: 15,
      stockByWarehouse: [
        { warehouse: warehouse._id, quantity: 42, binLocation: "A-02" }
      ]
    }
  ];

  for (const product of products) {
    const result = await Product.findOneAndUpdate(
      { sku: product.sku },
      { $setOnInsert: product },
      { upsert: true, new: true, runValidators: true }
    );

    console.log(`Product available: ${result.sku}`);
  }

  console.log("Safe seed completed. Existing records were preserved.");
}

async function runSeed() {
  try {
    await connectDB();
    await seedDatabase();
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

const scriptPath = process.argv[1];

if (scriptPath && import.meta.url === pathToFileURL(path.resolve(scriptPath)).href) {
  await runSeed();
}
