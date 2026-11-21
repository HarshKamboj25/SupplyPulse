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
    // 9A. Reject product creation with a nonexistent warehouse.
    const missingProductWarehouseId = new mongoose.Types.ObjectId().toString();

    const missingWarehouseProduct = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${warehouseManagerToken}`)
      .send({
        sku: "E2E-PRODUCT-MISSING-WH",
        name: "Invalid Warehouse Product",
        category: "Testing",
        unitPrice: 100,
        stockByWarehouse: [
          { warehouse: missingProductWarehouseId, quantity: 2 }
        ]
      });

    expect(missingWarehouseProduct.statusCode).toBe(404);

    // 9B. Reject product update with a nonexistent warehouse.
    const missingWarehouseUpdate = await request(app)
      .patch(`/api/v1/products/${productId}`)
      .set("Authorization", `Bearer ${warehouseManagerToken}`)
      .send({
        stockByWarehouse: [
          { warehouse: missingProductWarehouseId, quantity: 3 }
        ]
      });

    expect(missingWarehouseUpdate.statusCode).toBe(404);

    // 9C and 9D. Reject creation and update with an inactive warehouse.
    await Warehouse.updateOne(
      { _id: warehouseId },
      { $set: { isActive: false } }
    );

    const inactiveWarehouseProduct = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${warehouseManagerToken}`)
      .send({
        sku: "E2E-PRODUCT-INACTIVE-WH",
        name: "Inactive Warehouse Product",
        category: "Testing",
        unitPrice: 100,
        stockByWarehouse: [
          { warehouse: warehouseId, quantity: 2 }
        ]
      });

    expect(inactiveWarehouseProduct.statusCode).toBe(409);

    const inactiveWarehouseUpdate = await request(app)
      .patch(`/api/v1/products/${productId}`)
      .set("Authorization", `Bearer ${warehouseManagerToken}`)
      .send({
        stockByWarehouse: [
          { warehouse: warehouseId, quantity: 5 }
        ]
      });

    expect(inactiveWarehouseUpdate.statusCode).toBe(409);

    await Warehouse.updateOne(
      { _id: warehouseId },
      { $set: { isActive: true } }
    );

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

    // 10A. Concurrent PO creation must generate unique PO numbers.
    const concurrentOrderResponses = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(app)
          .post("/api/v1/purchase-orders")
          .set("Authorization", `Bearer ${procurementToken}`)
          .send({
            supplier: supplierId,
            warehouse: warehouseId,
            items: [
              {
                product: productId,
                quantity: 2,
                unitPrice: 100
              }
            ]
          })
      )
    );

    expect(
      concurrentOrderResponses.map(response => response.statusCode)
    ).toEqual([201, 201, 201]);

    const generatedPoNumbers = concurrentOrderResponses.map(
      response => response.body.data.poNumber
    );

    expect(new Set(generatedPoNumbers).size).toBe(3);

    generatedPoNumbers.forEach(poNumber => {
      expect(poNumber).toMatch(/^PO-\d+-[A-F0-9]{8}$/);
    });

    // 11. Procurement Officer must not approve an order.
    const forbiddenApproval = await request(app)
      .patch(`/api/v1/purchase-orders/${purchaseOrderId}/approve`)
      .set("Authorization", `Bearer ${procurementToken}`);

    expect(forbiddenApproval.statusCode).toBe(403);

    // 12. Two simultaneous admin approvals: exactly one must succeed.
    const approvalRequests = await Promise.all([
      request(app)
        .patch(`/api/v1/purchase-orders/${purchaseOrderId}/approve`)
        .set("Authorization", `Bearer ${adminToken}`),
      request(app)
        .patch(`/api/v1/purchase-orders/${purchaseOrderId}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
    ]);

    const approvalStatuses = approvalRequests
      .map(response => response.statusCode)
      .sort((a, b) => a - b);

    expect(approvalStatuses).toEqual([200, 409]);

    const successfulApproval = approvalRequests.find(
      response => response.statusCode === 200
    );

    expect(successfulApproval.body.data.status).toBe("APPROVED");

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

    // 17. Retrieve a specific purchase order by ID.
    const singleOrderResponse = await request(app)
      .get(`/api/v1/purchase-orders/${purchaseOrderId}`)
      .set("Authorization", `Bearer ${procurementToken}`);

    expect(singleOrderResponse.statusCode).toBe(200);
    expect(singleOrderResponse.body.success).toBe(true);
    expect(singleOrderResponse.body.data._id).toBe(purchaseOrderId);
    expect(singleOrderResponse.body.data.status).toBe("RECEIVED");

    // Verify populated supplier, warehouse and product details.
    expect(singleOrderResponse.body.data.supplier.name).toBe(
      "E2E Test Supplier"
    );

    expect(singleOrderResponse.body.data.warehouse.code).toBe("E2E-WH");

    expect(singleOrderResponse.body.data.items[0].product.sku).toBe(
      "E2E-PRODUCT-001"
    );

    // 18. A valid but nonexistent purchase-order ID must return 404.
    const nonexistentOrderResponse = await request(app)
      .get(`/api/v1/purchase-orders/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${procurementToken}`);

    expect(nonexistentOrderResponse.statusCode).toBe(404);

    // 19. A malformed purchase-order ID must return 400.
    const invalidOrderResponse = await request(app)
      .get("/api/v1/purchase-orders/invalid-id")
      .set("Authorization", `Bearer ${procurementToken}`);

    expect(invalidOrderResponse.statusCode).toBe(400);

    // 20. Prepare a reusable valid purchase-order payload.
    const referenceTestPayload = {
      supplier: supplierId,
      warehouse: warehouseId,
      items: [
        {
          product: productId,
          quantity: 2,
          unitPrice: 100
        }
      ]
    };

    const ordersBeforeReferenceTests = await PurchaseOrder.countDocuments();

    // 21. Reject a nonexistent supplier.
    const missingSupplierResponse = await request(app)
      .post("/api/v1/purchase-orders")
      .set("Authorization", `Bearer ${procurementToken}`)
      .send({
        ...referenceTestPayload,
        supplier: new mongoose.Types.ObjectId().toString()
      });

    expect(missingSupplierResponse.statusCode).toBe(404);

    // 22. Reject an inactive supplier.
    await Supplier.updateOne(
      { _id: supplierId },
      { $set: { isActive: false } }
    );

    const inactiveSupplierResponse = await request(app)
      .post("/api/v1/purchase-orders")
      .set("Authorization", `Bearer ${procurementToken}`)
      .send(referenceTestPayload);

    expect(inactiveSupplierResponse.statusCode).toBe(409);

    await Supplier.updateOne(
      { _id: supplierId },
      { $set: { isActive: true } }
    );

    // 23. Reject a nonexistent warehouse.
    const missingWarehouseResponse = await request(app)
      .post("/api/v1/purchase-orders")
      .set("Authorization", `Bearer ${procurementToken}`)
      .send({
        ...referenceTestPayload,
        warehouse: new mongoose.Types.ObjectId().toString()
      });

    expect(missingWarehouseResponse.statusCode).toBe(404);

    // 24. Reject an inactive warehouse.
    await Warehouse.updateOne(
      { _id: warehouseId },
      { $set: { isActive: false } }
    );

    const inactiveWarehouseResponse = await request(app)
      .post("/api/v1/purchase-orders")
      .set("Authorization", `Bearer ${procurementToken}`)
      .send(referenceTestPayload);

    expect(inactiveWarehouseResponse.statusCode).toBe(409);

    await Warehouse.updateOne(
      { _id: warehouseId },
      { $set: { isActive: true } }
    );

    // 25. Reject a nonexistent product.
    const missingProductResponse = await request(app)
      .post("/api/v1/purchase-orders")
      .set("Authorization", `Bearer ${procurementToken}`)
      .send({
        ...referenceTestPayload,
        items: [
          {
            product: new mongoose.Types.ObjectId().toString(),
            quantity: 2,
            unitPrice: 100
          }
        ]
      });

    expect(missingProductResponse.statusCode).toBe(404);

    // 26. Reject an inactive product.
    await Product.updateOne(
      { _id: productId },
      { $set: { isActive: false } }
    );

    const inactiveProductResponse = await request(app)
      .post("/api/v1/purchase-orders")
      .set("Authorization", `Bearer ${procurementToken}`)
      .send(referenceTestPayload);

    expect(inactiveProductResponse.statusCode).toBe(409);

    await Product.updateOne(
      { _id: productId },
      { $set: { isActive: true } }
    );

    // 27. Invalid references must not create purchase orders.
    const ordersAfterReferenceTests = await PurchaseOrder.countDocuments();

    expect(ordersAfterReferenceTests).toBe(ordersBeforeReferenceTests);
  });
});
