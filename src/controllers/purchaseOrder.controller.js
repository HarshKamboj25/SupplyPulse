import { randomUUID } from "node:crypto";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";
import Warehouse from "../models/Warehouse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import eventBus from "../events/eventBus.js";

export const listOrders = asyncHandler(async (_req, res) => {
  const orders = await PurchaseOrder.find()
    .populate("supplier", "name email")
    .populate("warehouse", "code name")
    .populate("items.product", "sku name")
    .sort({ createdAt: -1 });

  res.json({ success: true, count: orders.length, data: orders });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findById(req.params.id)
    .populate("supplier", "name email")
    .populate("warehouse", "code name")
    .populate("items.product", "sku name");

  if (!order) {
    throw new AppError("Purchase order not found", 404);
  }

  res.json({ success: true, data: order });
});

export const createOrder = asyncHandler(async (req, res) => {
  const { supplier, warehouse, items } = req.body;

  if (!supplier || !warehouse || !Array.isArray(items) || !items.length) {
    throw new AppError("Supplier, warehouse and at least one item are required");
  }

  const supplierRecord = await Supplier.findById(supplier);

  if (!supplierRecord) {
    throw new AppError("Supplier not found", 404);
  }

  if (!supplierRecord.isActive) {
    throw new AppError("Supplier is inactive", 409);
  }

  const warehouseRecord = await Warehouse.findById(warehouse);

  if (!warehouseRecord) {
    throw new AppError("Warehouse not found", 404);
  }

  if (!warehouseRecord.isActive) {
    throw new AppError("Warehouse is inactive", 409);
  }

  const productIds = [...new Set(items.map(item => item.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });

  if (products.length !== productIds.length) {
    throw new AppError("One or more products were not found", 404);
  }

  const inactiveProducts = products.filter(product => !product.isActive);

  if (inactiveProducts.length) {
    throw new AppError("One or more products are inactive", 409);
  }

  const poNumber = `PO-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const order = await PurchaseOrder.create({
    poNumber,
    supplier,
    warehouse,
    items,
    createdBy: req.user._id
  });

  res.status(201).json({ success: true, data: order });
});

export const approveOrder = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findOneAndUpdate(
    { _id: req.params.id, status: "DRAFT" },
    { $set: { status: "APPROVED" } },
    { new: true, runValidators: true }
  );

  if (!order) {
    const existingOrder = await PurchaseOrder.exists({
      _id: req.params.id
    });

    if (!existingOrder) {
      throw new AppError("Purchase order not found", 404);
    }

    throw new AppError("Only draft orders can be approved", 409);
  }

  res.json({ success: true, data: order });
});

export const receiveOrder = asyncHandler(async (req, res) => {
  const session = await PurchaseOrder.startSession();
  let receivedOrder;

  try {
    await session.withTransaction(async () => {
      const order = await PurchaseOrder.findById(req.params.id).session(session);

      if (!order) {
        throw new AppError("Purchase order not found", 404);
      }

      if (order.status !== "APPROVED") {
        throw new AppError("Only approved orders can be received", 409);
      }

      receivedOrder = await PurchaseOrder.findOneAndUpdate(
        { _id: order._id, status: "APPROVED" },
        {
          $set: {
            status: "RECEIVED",
            receivedAt: new Date()
          }
        },
        { new: true, session, runValidators: true }
      );

      if (!receivedOrder) {
        throw new AppError(
          "Purchase order is no longer available for receiving",
          409
        );
      }

      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);

        if (!product) {
          throw new AppError(`Product ${item.product} was not found`, 404);
        }

        const stock = product.stockByWarehouse.find(
          entry => entry.warehouse.toString() === order.warehouse.toString()
        );

        if (stock) {
          stock.quantity += item.quantity;
        } else {
          product.stockByWarehouse.push({
            warehouse: order.warehouse,
            quantity: item.quantity
          });
        }

        await product.save({ session });
      }
    });

    eventBus.emit("stock.received", {
      poNumber: receivedOrder.poNumber
    });

    res.json({
      success: true,
      message: "Stock received successfully",
      data: receivedOrder
    });
  } finally {
    await session.endSession();
  }
});
