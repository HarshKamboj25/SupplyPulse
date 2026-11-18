import { AppError } from "../utils/AppError.js";

export function validateBody(requiredFields = []) {
  return (req, _res, next) => {
    const missing = requiredFields.filter((field) =>
      req.body[field] === undefined || req.body[field] === null || req.body[field] === ""
    );
    if (missing.length) return next(new AppError(`Missing required fields: ${missing.join(", ")}`, 400));
    next();
  };
}
