import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import app from "../src/app.js";
import User from "../src/models/User.js";

jest.setTimeout(120000);

describe("Resource deletion referential integrity", () => {
  let replSet;
  let originalJwtSecret;
  let adminToken;

  const password = "SupplyPulseTest123!";

  async function createUser(email) {
    const registration = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Deletion Test Admin", email, password });

    expect(registration.statusCode).toBe(201);

    await User.updateOne(
      { email },
      { $set: { role: "ADMIN" } }
    );

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    expect(login.statusCode).toBe(200);
    return login.body.token;
  }

  beforeAll(async () => {
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "supplypulse-deletion-test-secret";

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
    adminToken = await createUser("deletion-admin@supplypulse.test");
  });

  afterAll(async () => {
    await mongoose.disconnect();

    if (replSet) await replSet.stop();

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  test("blocks deletion of resources referenced by inventory and purchase orders", async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };

    const warehouseResponse = await request(app)
      .post("/api/v1/warehouses")
      .set(auth)
      .send({
        code: "DEL-WH-01",
        name: "Deletion Test Warehouse",
        city: "Delhi"
      });

    expect(warehouseResponse.statusCode).toBe(201);
    const warehouseId = warehouseResponse.body.data._id;

    const supplierResponse = await request(app)
      .post("/api/v1/suppliers")
      .set(auth)
      .send({
        name: "Deletion Test Supplier",
        email: "deletion-supplier@supplypulse.test"
      });

    expect(supplierResponse.statusCode).toBe(201);
    const supplierId = supplierResponse.body.data._id;

    const productResponse = await request(app)
      .post("/api/v1/products")
      .set(auth)
      .send({
        sku: "DEL-PRODUCT-01",
        name: "Deletion Test Product",
        category: "Testing",
        unitPrice: 100,
        stockByWarehouse: [
          { warehouse: warehouseId, quantity: 10 }
        ]
      });

    expect(productResponse.statusCode).toBe(201);
    const productId = productResponse.body.data._id;

    const orderResponse = await request(app)
      .post("/api/v1/purchase-orders")
      .set(auth)
      .send({
        supplier: supplierId,
        warehouse: warehouseId,
        items: [
          { product: productId, quantity: 2, unitPrice: 100 }
        ]
      });

    expect(orderResponse.statusCode).toBe(201);

    const deletionAttempts = await Promise.all([
      request(app)
        .delete(`/api/v1/products/${productId}`)
        .set(auth),
      request(app)
        .delete(`/api/v1/warehouses/${warehouseId}`)
        .set(auth),
      request(app)
        .delete(`/api/v1/suppliers/${supplierId}`)
        .set(auth)
    ]);

    expect(deletionAttempts.map(response => response.statusCode))
      .toEqual([409, 409, 409]);

    expect(deletionAttempts.every(
      response => response.body.success === false
    )).toBe(true);

    const remainingCounts = await Promise.all([
      request(app).get(`/api/v1/products/${productId}`).set(auth),
      request(app).get(`/api/v1/warehouses/${warehouseId}`).set(auth),
      request(app).get(`/api/v1/suppliers/${supplierId}`).set(auth)
    ]);

    expect(remainingCounts.map(response => response.statusCode))
      .toEqual([200, 200, 200]);
  });

  test("blocks deletion of a product with warehouse stock even without purchase orders", async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };

    const warehouseResponse = await request(app)
      .post("/api/v1/warehouses")
      .set(auth)
      .send({
        code: "STOCK-WH-01",
        name: "Stock Protection Test Warehouse",
        city: "Delhi"
      });

    expect(warehouseResponse.statusCode).toBe(201);
    const warehouseId = warehouseResponse.body.data._id;

    const productResponse = await request(app)
      .post("/api/v1/products")
      .set(auth)
      .send({
        sku: "STOCK-PRODUCT-01",
        name: "Stock Protection Test Product",
        category: "Testing",
        unitPrice: 100,
        stockByWarehouse: [
          { warehouse: warehouseId, quantity: 10 }
        ]
      });

    expect(productResponse.statusCode).toBe(201);
    const productId = productResponse.body.data._id;

    const deletionResponse = await request(app)
      .delete(`/api/v1/products/${productId}`)
      .set(auth);

    expect(deletionResponse.statusCode).toBe(409);
    expect(deletionResponse.body.success).toBe(false);

    const remainingProduct = await request(app)
      .get(`/api/v1/products/${productId}`)
      .set(auth);

    expect(remainingProduct.statusCode).toBe(200);
    expect(remainingProduct.body.data._id).toBe(productId);
  });
});