import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import path from "node:path";
import bcrypt from "bcryptjs";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import app from "../src/app.js";
import User from "../src/models/User.js";
import jwt from "jsonwebtoken";

jest.setTimeout(120000);

describe("SupplyPulse Authentication E2E", () => {
  let replSet;
  let originalJwtSecret;

  const password = "SupplyPulseTest123!";
  const email = "auth-e2e@supplypulse.test";

  beforeAll(async () => {
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "supplypulse-auth-e2e-test-secret";

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
    await User.init();
  });

  afterEach(async () => {
    await User.deleteMany({});
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

  test("registers a user with the default Procurement Officer role", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Auth Test User",
        email,
        password
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.role).toBe("PROCUREMENT_OFFICER");
    expect(response.body.token).toBeTruthy();

    const user = await User.findOne({ email }).select("+passwordHash");

    expect(user).toBeTruthy();
    expect(user.passwordHash).not.toBe(password);
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
  });

  test("rejects public role assignment and ADMIN privilege escalation", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Unauthorized Admin",
        email,
        password,
        role: "ADMIN"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain("Unknown fields");

    expect(await User.countDocuments()).toBe(0);
  });

  test("rejects duplicate email registration", async () => {
    await User.create({
      name: "Existing User",
      email,
      passwordHash: await bcrypt.hash(password, 12)
    });

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Duplicate User",
        email,
        password
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.message).toContain("already registered");
  });

  test("logs in an existing user with valid credentials", async () => {
    await User.create({
      name: "Login User",
      email,
      passwordHash: await bcrypt.hash(password, 12)
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(email);
    expect(response.body.token).toBeTruthy();
  });

  test("rejects invalid login credentials", async () => {
    await User.create({
      name: "Login User",
      email,
      passwordHash: await bcrypt.hash(password, 12)
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email,
        password: "WrongPassword123!"
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  test("rejects login for inactive accounts", async () => {
    await User.create({
      name: "Inactive User",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      isActive: false
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Account is disabled");
  });

  test("returns the authenticated user's profile", async () => {
    const registration = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Profile User",
        email,
        password
      });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registration.body.token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  test("rejects missing and invalid authentication tokens", async () => {
    const missingToken = await request(app)
      .get("/api/v1/auth/me");

    const invalidToken = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid.token.value");

    expect(missingToken.statusCode).toBe(401);
    expect(invalidToken.statusCode).toBe(401);
  });
  test("rejects tokens signed using an unexpected algorithm", async () => {
    const user = await User.create({ name: "Algorithm Test User", email: "algorithm-e2e@supplypulse.test", passwordHash: "test-password-hash" });
    const token = jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { algorithm: "HS384", expiresIn: "1h" });
    const response = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer " + token);
    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });
});


