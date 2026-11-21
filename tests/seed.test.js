import { jest } from "@jest/globals";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import User from "../src/models/User.js";
import Warehouse from "../src/models/Warehouse.js";
import Supplier from "../src/models/Supplier.js";
import Product from "../src/models/Product.js";
import { seedDatabase } from "../src/scripts/seed.js";

jest.setTimeout(120000);

describe("SupplyPulse Safe Seed", () => {
  let replSet;
  let originalEmail;
  let originalPassword;

  const seedEmail = "seed-admin@supplypulse.test";
  const seedPassword = "SupplyPulseSeedTest123!";

  beforeAll(async () => {
    originalEmail = process.env.SEED_ADMIN_EMAIL;
    originalPassword = process.env.SEED_ADMIN_PASSWORD;

    process.env.SEED_ADMIN_EMAIL = seedEmail;
    process.env.SEED_ADMIN_PASSWORD = seedPassword;

    const binaryPath = path.join(
      process.env.USERPROFILE,
      ".cache",
      "mongodb-binaries",
      "mongodb-win32-x86_64-windows-8.2.6",
      "bin",
      "mongod.exe"
    );

    replSet = await MongoMemoryReplSet.create({
      binary: {
        version: "8.2.6",
        systemBinary: binaryPath
      },
      replSet: { count: 1 }
    });

    await mongoose.connect(replSet.getUri());
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Warehouse.deleteMany({}),
      Supplier.deleteMany({}),
      Product.deleteMany({})
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();

    if (replSet) {
      await replSet.stop();
    }

    if (originalEmail === undefined) {
      delete process.env.SEED_ADMIN_EMAIL;
    } else {
      process.env.SEED_ADMIN_EMAIL = originalEmail;
    }

    if (originalPassword === undefined) {
      delete process.env.SEED_ADMIN_PASSWORD;
    } else {
      process.env.SEED_ADMIN_PASSWORD = originalPassword;
    }
  });

  test("creates the admin and demo inventory on the first run", async () => {
    await seedDatabase();

    expect(await User.countDocuments({ email: seedEmail })).toBe(1);
    expect(await Warehouse.countDocuments({ code: "WH-DEL-01" })).toBe(1);
    expect(await Supplier.countDocuments({ email: "supplier@example.com" })).toBe(1);
    expect(await Product.countDocuments({})).toBe(2);
  });

  test("does not create duplicate records on repeated runs", async () => {
    await seedDatabase();
    await seedDatabase();

    expect(await User.countDocuments({ email: seedEmail })).toBe(1);
    expect(await Warehouse.countDocuments({ code: "WH-DEL-01" })).toBe(1);
    expect(await Supplier.countDocuments({ email: "supplier@example.com" })).toBe(1);
    expect(await Product.countDocuments({})).toBe(2);
  });

  test("preserves existing admin credentials and product stock", async () => {
    const passwordHash = await bcrypt.hash("ExistingAdminPassword123!", 12);

    await User.create({
      name: "Existing Admin",
      email: seedEmail,
      passwordHash,
      role: "ADMIN"
    });

    const warehouse = await Warehouse.create({
      code: "WH-DEL-01",
      name: "Existing Warehouse",
      city: "Mumbai",
      capacityUnits: 9000
    });

    await Product.create({
      sku: "KB-001",
      name: "Existing Keyboard",
      category: "Existing",
      unitPrice: 1000,
      reorderThreshold: 3,
      stockByWarehouse: [{
        warehouse: warehouse._id,
        quantity: 99,
        binLocation: "Z-99"
      }]
    });

    await seedDatabase();

    const admin = await User.findOne({ email: seedEmail }).select("+passwordHash");
    const product = await Product.findOne({ sku: "KB-001" });

    expect(admin.name).toBe("Existing Admin");
    expect(admin.passwordHash).toBe(passwordHash);
    expect(await bcrypt.compare("ExistingAdminPassword123!", admin.passwordHash)).toBe(true);
    expect(product.name).toBe("Existing Keyboard");
    expect(product.stockByWarehouse[0].quantity).toBe(99);
    expect(product.stockByWarehouse[0].binLocation).toBe("Z-99");
  });

  test("rejects missing seed credentials", async () => {
    delete process.env.SEED_ADMIN_EMAIL;

    await expect(seedDatabase()).rejects.toThrow(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be configured."
    );

    process.env.SEED_ADMIN_EMAIL = seedEmail;
  });

  test("rejects a weak seed password", async () => {
    process.env.SEED_ADMIN_PASSWORD = "weak";

    await expect(seedDatabase()).rejects.toThrow(
      "Seed admin password must contain at least 16 characters."
    );

    process.env.SEED_ADMIN_PASSWORD = seedPassword;
  });

  test("rejects a configured email belonging to a non-admin user", async () => {
    await User.create({
      name: "Regular User",
      email: seedEmail,
      passwordHash: "existing-hash",
      role: "PROCUREMENT_OFFICER"
    });

    await expect(seedDatabase()).rejects.toThrow(
      "Configured seed email already belongs to a non-admin user."
    );
  });
});
