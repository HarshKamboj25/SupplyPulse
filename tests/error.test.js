import express from "express";
import request from "supertest";
import { errorHandler } from "../src/middleware/error.js";
import { AppError } from "../src/utils/AppError.js";

function createTestApp(error) {
  const app = express();

  app.get("/test-error", (_req, _res, next) => {
    next(error);
  });

  app.use(errorHandler);
  return app;
}

describe("Centralized error handling", () => {
  let originalNodeEnv;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  test("hides unexpected internal errors in production", async () => {
    const app = createTestApp(
      new Error("MongoDB connection string leaked")
    );

    const response = await request(app).get("/test-error");

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Internal server error"
    });
  });

  test("preserves operational AppError messages", async () => {
    const app = createTestApp(
      new AppError("Access denied", 403)
    );

    const response = await request(app).get("/test-error");

    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Access denied"
    });
  });

  test("maps Mongoose validation errors to 400", async () => {
    const error = new Error("Validation failed");
    error.name = "ValidationError";
    error.errors = {
      name: { message: "Name is required" }
    };

    const response = await request(createTestApp(error))
      .get("/test-error");

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Name is required");
  });

  test("maps invalid MongoDB IDs to 400", async () => {
    const error = new Error("Cast failed");
    error.name = "CastError";

    const response = await request(createTestApp(error))
      .get("/test-error");

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Invalid resource ID");
  });

  test("maps duplicate key errors to 409", async () => {
    const error = new Error("Duplicate key");
    error.code = 11000;

    const response = await request(createTestApp(error))
      .get("/test-error");

    expect(response.statusCode).toBe(409);
    expect(response.body.message)
      .toBe("A record with this unique value already exists");
  });
});

describe("Centralized error handling edge cases", () => {
  test("exposes unexpected error messages in development", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      const app = createTestApp(new Error("Development diagnostic"));
      const response = await request(app).get("/test-error");

      expect(response.statusCode).toBe(500);
      expect(response.body.message).toBe("Development diagnostic");
    } finally {
      if (originalEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalEnv;
      }
    }
  });

  test("returns all Mongoose validation error messages", async () => {
    const error = new Error("Validation failed");
    error.name = "ValidationError";
    error.errors = {
      name: { message: "Name is required" },
      email: { message: "Email is invalid" }
    };

    const response = await request(createTestApp(error))
      .get("/test-error");

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Name is required, Email is invalid");
  });

  test("hides unexpected errors without a message", async () => {
    const error = new Error();
    error.message = "";

    const response = await request(createTestApp(error))
      .get("/test-error");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Internal server error");
  });

  test("returns 404 for unknown routes", async () => {
    const app = express();
    app.use((req, _res, next) => {
      next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
    });
    app.use(errorHandler);

    const response = await request(app).get("/missing-route");

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Route not found");
  });

  test("preserves the generic response for unexpected production errors", async () => {
    const response = await request(
      createTestApp(new Error("Sensitive database details"))
    ).get("/test-error");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Internal server error");
    expect(response.body.message).not.toContain("database");
  });
});
