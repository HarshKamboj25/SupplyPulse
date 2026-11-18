export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((item) => item.message).join(", ");
  }
  if (err.name === "CastError") {
    status = 400;
    message = "Invalid resource ID";
  }
  if (err.code === 11000) {
    status = 409;
    message = "A record with this unique value already exists";
  }

  res.status(status).json({ success: false, message });
}
