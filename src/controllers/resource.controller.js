import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const list = (Model, populate = "") => asyncHandler(async (_req, res) => {
  let query = Model.find().sort({ createdAt: -1 });
  if (populate) query = query.populate(populate);
  const items = await query;
  res.json({ success: true, count: items.length, data: items });
});

export const getOne = (Model, populate = "") => asyncHandler(async (req, res) => {
  let query = Model.findById(req.params.id);
  if (populate) query = query.populate(populate);
  const item = await query;
  if (!item) throw new AppError("Record not found", 404);
  res.json({ success: true, data: item });
});

export const create = (Model) => asyncHandler(async (req, res) => {
  const item = await Model.create(req.body);
  res.status(201).json({ success: true, data: item });
});

export const update = (Model) => asyncHandler(async (req, res) => {
  const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true
  });
  if (!item) throw new AppError("Record not found", 404);
  res.json({ success: true, data: item });
});

export const remove = (Model) => asyncHandler(async (req, res) => {
  const item = await Model.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError("Record not found", 404);
  res.json({ success: true, message: "Record deleted" });
});
