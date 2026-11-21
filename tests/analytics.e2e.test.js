import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import app from "../src/app.js";
import User from "../src/models/User.js";
import Product from "../src/models/Product.js";

jest.setTimeout(120000);

describe("SupplyPulse Low-Stock Analytics E2E", () => {
  let replSet;
  let originalJwtSecret;
  let token;

  const testPassword = "SupplyPulseTest123!";

  beforeAll(async () => {
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "supplypulse-analytics-test-secret";

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

    await Promise.all([
      User.init(),
      Product.init()
    ]);

    const registration = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Analytics Test User",
        email: "analytics-e2e@supplypulse.test",
        password: testPassword
      });

    expect(registration.statusCode).toBe(201);

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "analytics-e2e@supplypulse.test",
        password: testPassword
      });

    expect(login.statusCode).toBe(200);
    token = login.body.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();

    if (replSet) {
      await replSet.stop();
    }

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  test("returns correctly sorted products at or below their reorder threshold", async () => {
    const warehouseA = new mongoose.Types.ObjectId();
    const warehouseB = new mongoose.Types.ObjectId();

    await Product.insertMany([
      {
        sku: "ANALYTICS-ZERO",
        name: "Zero Stock Product",
        category: "Testing",
        unitPrice: 100,
        reorderThreshold: 5,
        stockByWarehouse: [
          { warehouse: warehouseA, quantity: 0 }
        ]
      },
      {
        sku: "ANALYTICS-ZERO-THRESHOLD",
        name: "Zero Threshold Product",
        category: "Testing",
        unitPrice: 100,
        reorderThreshold: 0,
        stockByWarehouse: [
          { warehouse: warehouseA, quantity: 0 }
        ]
      },
      {
        sku: "ANALYTICS-AT-THRESHOLD",
        name: "At Threshold Product",
        category: "Testing",
        unitPrice: 100,
        reorderThreshold: 5,
        stockByWarehouse: [
          { warehouse: warehouseA, quantity: 5 }
        ]
      },
      {
        sku: "ANALYTICS-ABOVE-THRESHOLD",
        name: "Above Threshold Product",
        category: "Testing",
        unitPrice: 100,
        reorderThreshold: 5,
        stockByWarehouse: [
          { warehouse: warehouseA, quantity: 6 }
        ]
      },
      {
        sku: "ANALYTICS-MULTI-WAREHOUSE",
        name: "Multi Warehouse Product",
        category: "Testing",
        unitPrice: 100,
        reorderThreshold: 5,
        stockByWarehouse: [
          { warehouse: warehouseA, quantity: 2 },
          { warehouse: warehouseB, quantity: 9 }
        ]
      },
      {
        sku: "ANALYTICS-EMPTY-STOCK",
        name: "Empty Stock Product",
        category: "Testing",
        unitPrice: 100,
        reorderThreshold: 5,
        stockByWarehouse: []
      }
    ]);

    const response = await request(app)
      .get("/api/v1/analytics/low-stock")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(4);

    const rows = response.body.data;

    expect(rows.map(row => row.quantity)).toEqual([0, 0, 2, 5]);

    const returnedSkus = rows.map(row => row.sku);

    expect(returnedSkus).toContain("ANALYTICS-ZERO");
    expect(returnedSkus).toContain("ANALYTICS-ZERO-THRESHOLD");
    expect(returnedSkus).toContain("ANALYTICS-AT-THRESHOLD");
    expect(returnedSkus).toContain("ANALYTICS-MULTI-WAREHOUSE");

    expect(returnedSkus).not.toContain("ANALYTICS-ABOVE-THRESHOLD");
    expect(returnedSkus).not.toContain("ANALYTICS-EMPTY-STOCK");

    const multiWarehouseRows = rows.filter(
      row => row.sku === "ANALYTICS-MULTI-WAREHOUSE"
    );

    expect(multiWarehouseRows).toHaveLength(1);
    expect(multiWarehouseRows[0].quantity).toBe(2);
  });

  test("rejects unauthenticated analytics requests", async () => {
    const response = await request(app)
      .get("/api/v1/analytics/low-stock");

    expect(response.statusCode).toBe(401);
  });
});
