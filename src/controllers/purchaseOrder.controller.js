import PurchaseOrder from "../models/PurchaseOrder.js";
import Product from "../models/Product.js";
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

export const createOrder = asyncHandler(async (req, res) => {
  const { supplier, warehouse, items } = req.body;
  if (!supplier || !warehouse || !Array.isArray(items) || !items.length) {
    throw new AppError("Supplier, warehouse and at least one item are required");
  }
  const poNumber = `PO-${Date.now()}`;
  const order = await PurchaseOrder.create({
    poNumber, supplier, warehouse, items, createdBy: req.user._id
  });
  res.status(201).json({ success: true, data: order });
});

export const approveOrder = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) throw new AppError("Purchase order not found", 404);
  if (order.status !== "DRAFT") throw new AppError("Only draft orders can be approved", 409);
  order.status = "APPROVED";
  await order.save();
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