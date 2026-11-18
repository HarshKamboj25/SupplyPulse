import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import app from "../src/app.js";
import User from "../src/models/User.js";
import Supplier from "../src/models/Supplier.js";
import Warehouse from "../src/models/Warehouse.js";
import Product from "../src/models/Product.js";
import PurchaseOrder from "../src/models/PurchaseOrder.js";

jest.setTimeout(120000);

describe("SupplyPulse Purchase Order E2E", () => {
  let replSet;
  let originalJwtSecret;

  let adminToken;
  let procurementToken;
  let warehouseManagerToken;

  let supplierId;
  let warehouseId;
  let productId;
  let purchaseOrderId;

  const testPassword = "SupplyPulseTest123!";

  async function registerAndLogin(name, email) {
    const registration = await request(app)
      .post("/api/v1/auth/register")
      .send({ name, email, password: testPassword });

    expect(registration.statusCode).toBe(201);
    expect(registration.body.success).toBe(true);

    return email;
  }

  async function login(email) {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: testPassword });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeTruthy();

    return response.body.token;
  }

  beforeAll(async () => {
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "supplypulse-e2e-test-secret-only";

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
      Supplier.init(),
      Warehouse.init(),
      Product.init(),
      PurchaseOrder.init()
    ]);
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

  test("completes the authenticated purchase-order lifecycle", async () => {
    // 1. Register three users through the public API.
    const procurementEmail = "procurement-e2e@supplypulse.test";
    const adminEmail = "admin-e2e@supplypulse.test";
    const warehouseEmail = "warehouse-e2e@supplypulse.test";

    await registerAndLogin("E2E Procurement", procurementEmail);
    await registerAndLogin("E2E Admin", adminEmail);
    await registerAndLogin("E2E Warehouse Manager", warehouseEmail);

    // 2. Assign privileged roles only inside the isolated test database.
    await User.updateOne(
      { email: adminEmail },
      { $set: { role: "ADMIN" } }
    );

    await User.updateOne(
      { email: warehouseEmail },
      { $set: { role: "WAREHOUSE_MANAGER" } }
    );

    // 3. Obtain fresh tokens through the actual login endpoint.
    procurementToken = await login(procurementEmail);
    adminToken = await login(adminEmail);
    warehouseManagerToken = await login(warehouseEmail);

    // 4. Verify authentication protection.
    const unauthenticatedMe = await request(app).get("/api/v1/auth/me");
    expect(unauthenticatedMe.statusCode).toBe(401);

    const authenticatedMe = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${procurementToken}`);

    expect(authenticatedMe.statusCode).toBe(200);
    expect(authenticatedMe.body.user.email).toBe(procurementEmail);

    // 5. Verify unauthenticated purchase-order creation is blocked.
    const unauthenticatedOrder = await request(app)
      .post("/api/v1/purchase-orders")
      .send({});

    expect(unauthenticatedOrder.statusCode).toBe(401);

    // 6. Create a supplier through the API as Procurement Officer.
    const supplierResponse = await request(app)
      .post("/api/v1/suppliers")
      .set("Authorization", `Bearer ${procurementToken}`)
      .send({
        name: "E2E Test Supplier",
        email: "supplier-e2e@supplypulse.test",
        phone: "9999999999",
        maxLeadDays: 5
      });

    expect(supplierResponse.statusCode).toBe(201);
    supplierId = supplierResponse.body.data._id;

    // 7. Verify Procurement Officer cannot create a warehouse.
    const forbiddenWarehouse = await request(app)
      .post("/api/v1/warehouses")
      .set("Authorization", `Bearer ${procurementToken}`)
      .send({
        code: "E2E-FORBIDDEN",
        name: "Forbidden Warehouse",
        city: "Delhi"
      });

    expect(forbiddenWarehouse.statusCode).toBe(403);

    // 8. Create a warehouse through the API as Admin.
    const warehouseResponse = await request(app)
      .post("/api/v1/warehouses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "E2E-WH",
        name: "E2E Test Warehouse",
        city: "Delhi",
        capacityUnits: 1000
      });

    expect(warehouseResponse.statusCode).toBe(201);
    warehouseId = warehouseResponse.body.data._id;

    // 9. Create a product through the API as Warehouse Manager.
    const productResponse = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${warehouseManagerToken}`)
      .send({
        sku: "E2E-PRODUCT-001",
        name: "E2E Test Product",
        category: "Testing",
        unitPrice: 100,
        reorderThreshold: 2,
        stockByWarehouse: [
          {
            warehouse: warehouseId,
            quantity: 4,
            binLocation: "A-01"
          }
        ]
      });

    expect(productResponse.statusCode).toBe(201);
    productId = productResponse.body.data._id;

    // 10. Create a purchase order as Procurement Officer.
    const orderResponse = await request(app)
      .post("/api/v1/purchase-orders")
      .set("Authorization", `Bearer ${procurementToken}`)
      .send({
        supplier: supplierId,
        warehouse: warehouseId,
        items: [
          {
            product: productId,
            quantity: 6,
            unitPrice: 100
          }
        ]
      });

    expect(orderResponse.statusCode).toBe(201);
    expect(orderResponse.body.data.status).toBe("DRAFT");
    purchaseOrderId = orderResponse.body.data._id;

    // 11. Procurement Officer must not approve an order.
    const forbiddenApproval = await request(app)
      .patch(`/api/v1/purchase-orders/${purchaseOrderId}/approve`)
      .set("Authorization", `Bearer ${procurementToken}`);

    expect(forbiddenApproval.statusCode).toBe(403);

    // 12. Admin approves the purchase order.
    const approvalResponse = await request(app)
      .patch(`/api/v1/purchase-orders/${purchaseOrderId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(approvalResponse.statusCode).toBe(200);
    expect(approvalResponse.body.data.status).toBe("APPROVED");

    // 13. Procurement Officer must not receive the order.
    const forbiddenReceipt = await request(app)
      .patch(`/api/v1/purchase-orders/${purchaseOrderId}/receive`)
      .set("Authorization", `Bearer ${procurementToken}`);

    expect(forbiddenReceipt.statusCode).toBe(403);

    // 14. Warehouse Manager receives the approved order.
    const receiptResponse = await request(app)
      .patch(`/api/v1/purchase-orders/${purchaseOrderId}/receive`)
      .set("Authorization", `Bearer ${warehouseManagerToken}`);

    expect(receiptResponse.statusCode).toBe(200);
    expect(receiptResponse.body.success).toBe(true);
    expect(receiptResponse.body.data.status).toBe("RECEIVED");
    expect(receiptResponse.body.data.receivedAt).toBeTruthy();

    // 15. Verify final stock through the actual Product API.
    const finalProductResponse = await request(app)
      .get(`/api/v1/products/${productId}`)
      .set("Authorization", `Bearer ${procurementToken}`);

    expect(finalProductResponse.statusCode).toBe(200);

    const stockEntry = finalProductResponse.body.data.stockByWarehouse.find(
      entry => entry.warehouse.toString() === warehouseId
    );

    expect(stockEntry).toBeTruthy();
    expect(stockEntry.quantity).toBe(10);

    // 16. Verify the order appears in the purchase-order listing.
    const orderListResponse = await request(app)
      .get("/api/v1/purchase-orders")
      .set("Authorization", `Bearer ${procurementToken}`);

    expect(orderListResponse.statusCode).toBe(200);

    const listedOrder = orderListResponse.body.data.find(
      order => order._id === purchaseOrderId
    );

    expect(listedOrder).toBeTruthy();
    expect(listedOrder.status).toBe("RECEIVED");
  });
});
