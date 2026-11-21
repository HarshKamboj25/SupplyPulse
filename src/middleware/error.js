import { AppError } from "../utils/AppError.js";

export function notFound(req, _res, next) {
  next(new AppError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404
  ));
}

export function errorHandler(err, _req, res, _next) {
  let status = 500;
  let message = "Internal server error";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid resource ID";
  } else if (err.code === 11000) {
    status = 409;
    message = "A record with this unique value already exists";
  } else if (err.isOperational) {
    status = err.statusCode || 400;
    message = err.message;
  } else if (process.env.NODE_ENV === "development") {
    message = err.message || message;
  }

  res.status(status).json({ success: false, message });
}
