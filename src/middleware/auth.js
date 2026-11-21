import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new AppError("Authentication required", 401);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  const user = await User.findById(payload.sub).select("-passwordHash");
  if (!user || !user.isActive) throw new AppError("User is unavailable", 401);
  req.user = user;
  next();
});

export const allowRoles = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError("You do not have permission to perform this action", 403));
  }
  next();
};
