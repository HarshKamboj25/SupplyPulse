import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function createToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new AppError("Name, email and password are required");
  if (password.length < 8) throw new AppError("Password must be at least 8 characters");
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new AppError("Email is already registered", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });
  res.status(201).json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token: createToken(user)
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || "").toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    throw new AppError("Invalid email or password", 401);
  }
  if (!user.isActive) throw new AppError("Account is disabled", 403);
  res.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token: createToken(user)
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});
