import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import PurchaseOrder from "../src/models/PurchaseOrder.js";
import Product from "../src/models/Product.js";
import Supplier from "../src/models/Supplier.js";
import Warehouse from "../src/models/Warehouse.js";
import User from "../src/models/User.js";
import { receiveOrder } from "../src/controllers/purchaseOrder.controller.js";

jest.setTimeout(120000);

let replSet;

const models = [PurchaseOrder, Product, Supplier, Warehouse, User];

async function createFixtures(status = "APPROVED") {
  const supplier = await Supplier.create({
    name: "Test Supplier"
  });

  const warehouse = await Warehouse.create({
    code: "TEST-WH",
    name: "Test Warehouse",
    city: "Delhi"
  });

  const user = await User.create({
    name: "Test Admin",
    email: "admin@test.com",
    passwordHash: "test-hash",
    role: "ADMIN"
  });

  const product = await Product.create({
    sku: "TEST-001",
    name: "Test Product",
    category: "Testing",
    unitPrice: 100,
    stockByWarehouse: [{
      warehouse: warehouse._id,
      quantity: 4
    }]
  });

  const order = await PurchaseOrder.create({
    poNumber: `PO-TEST-${new mongoose.Types.ObjectId()}`,
    supplier: supplier._id,
    warehouse: warehouse._id,
    createdBy: user._id,
    status,
    items: [{
      product: product._id,
      quantity: 6,
      unitPrice: 100
    }]
  });

  return { supplier, warehouse, user, product, order };
}

async function callReceiveOrder(orderId) {
  let response;
  let forwardedError;

  const req = {
    params: { id: orderId.toString() }
  };

  const res = {
    json(body) {
      response = body;
      return this;
    }
  };

  await receiveOrder(req, res, error => {
    forwardedError = error;
  });

  return { response, error: forwardedError };
}

beforeAll(async () => {
  const systemBinary =
    process.env.USERPROFILE +
    "/.cache/mongodb-binaries/mongodb-win32-x86_64-windows-8.2.6/bin/mongod.exe";

  replSet = await MongoMemoryReplSet.create({
    binary: {
      version: "8.2.6",
      systemBinary
    },
    replSet: { count: 1 }
  });

  await mongoose.connect(replSet.getUri());
});

afterEach(async () => {
  await Promise.all(models.map(model => model.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();

  if (replSet) {
    await replSet.stop();
  }
});

describe("Purchase Order Receiving Transaction", () => {
  test("receives an approved order and increases stock", async () => {
    const { product, order, warehouse } = await createFixtures();

    const result = await callReceiveOrder(order._id);

    const updatedProduct = await Product.findById(product._id);
    const updatedOrder = await PurchaseOrder.findById(order._id);

    expect(result.error).toBeUndefined();
    expect(result.response.success).toBe(true);
    expect(updatedOrder.status).toBe("RECEIVED");
    expect(updatedOrder.receivedAt).toBeInstanceOf(Date);

    const stock = updatedProduct.stockByWarehouse.find(
      entry => entry.warehouse.toString() === warehouse._id.toString()
    );

    expect(stock.quantity).toBe(10);
  });

  test("returns 404 when purchase order does not exist", async () => {
    const missingId = new mongoose.Types.ObjectId();

    const result = await callReceiveOrder(missingId);

    expect(result.error).toBeDefined();
    expect(result.error.statusCode).toBe(404);
  });

  test("rejects an order that is not approved", async () => {
    const { order, product } = await createFixtures("DRAFT");

    const result = await callReceiveOrder(order._id);

    const unchangedOrder = await PurchaseOrder.findById(order._id);
    const unchangedProduct = await Product.findById(product._id);

    expect(result.error).toBeDefined();
    expect(result.error.statusCode).toBe(409);
    expect(unchangedOrder.status).toBe("DRAFT");
    expect(unchangedProduct.stockByWarehouse[0].quantity).toBe(4);
  });

  test("rolls back order status and stock when a product is missing", async () => {
    const { order, product } = await createFixtures();

    order.items.push({
      product: new mongoose.Types.ObjectId(),
      quantity: 5,
      unitPrice: 100
    });

    await order.save();

    const result = await callReceiveOrder(order._id);

    const unchangedOrder = await PurchaseOrder.findById(order._id);
    const unchangedProduct = await Product.findById(product._id);

    expect(result.error).toBeDefined();
    expect(result.error.statusCode).toBe(404);
    expect(unchangedOrder.status).toBe("APPROVED");
    expect(unchangedProduct.stockByWarehouse[0].quantity).toBe(4);
  });
  test("concurrent receiving processes an order only once", async () => {
    const { order, product } = await createFixtures();

    const results = await Promise.all([
      callReceiveOrder(order._id),
      callReceiveOrder(order._id)
    ]);

    const successfulResults = results.filter(result => !result.error);
    const failedResults = results.filter(result => result.error);

    const finalOrder = await PurchaseOrder.findById(order._id);
    const finalProduct = await Product.findById(product._id);

    expect(successfulResults).toHaveLength(1);
    expect(failedResults).toHaveLength(1);
    expect(failedResults[0].error.statusCode).toBe(409);
    expect(finalOrder.status).toBe("RECEIVED");
    expect(finalProduct.stockByWarehouse[0].quantity).toBe(10);
  });

  test("accumulates quantities when an order contains duplicate product lines", async () => {
    const { order, product } = await createFixtures();

    order.items.push({
      product: product._id,
      quantity: 5,
      unitPrice: 100
    });

    await order.save();

    const result = await callReceiveOrder(order._id);

    const updatedProduct = await Product.findById(product._id);

    expect(result.error).toBeUndefined();
    expect(updatedProduct.stockByWarehouse[0].quantity).toBe(15);
  });
});