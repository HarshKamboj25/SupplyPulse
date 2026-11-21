import { describe, expect, test } from "@jest/globals";
import { validateBody } from "../src/middleware/validate.js";

const schema = {
  name: { type: "string", required: true, minLength: 2, maxLength: 20 },
  email: {
    type: "string",
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  quantity: { type: "number", min: 0, integer: true },
  isActive: { type: "boolean" },
  items: {
    type: "array",
    minItems: 1,
    items: {
      product: { type: "string", required: true },
      quantity: { type: "number", required: true, min: 1, integer: true }
    }
  }
};

function runValidation(body, options = {}) {
  const req = { body };
  let nextError;

  const next = (error) => {
    nextError = error;
  };

  validateBody(schema, options)(req, {}, next);

  return { req, nextError };
}

describe("validateBody middleware", () => {
  test("accepts valid request data", () => {
    const result = runValidation({
      name: "Aditi",
      email: "aditi@example.com",
      quantity: 5,
      isActive: true,
      items: [{ product: "ABC", quantity: 2 }]
    });

    expect(result.nextError).toBeUndefined();
  });

  test("rejects missing required fields", () => {
    const result = runValidation({
      name: "Aditi"
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("email is required");
  });

  test("rejects unknown fields", () => {
    const result = runValidation({
      name: "Aditi",
      email: "aditi@example.com",
      role: "ADMIN"
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("Unknown fields");
  });

  test("rejects invalid data types", () => {
    const result = runValidation({
      name: "Aditi",
      email: "aditi@example.com",
      quantity: "five"
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("quantity must be a valid number");
  });

  test("rejects invalid nested array entries", () => {
    const result = runValidation({
      name: "Aditi",
      email: "aditi@example.com",
      items: [{ product: "ABC", quantity: 0 }]
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("items[0].quantity must be at least 1");
  });

  test("rejects invalid email format", () => {
    const result = runValidation({
      name: "Aditi",
      email: "invalid-email"
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("email has an invalid format");
  });

  test("rejects an empty body when at least one field is required", () => {
    const result = runValidation({}, { requireAtLeastOne: true });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("At least one field must be provided");
  });

  test("rejects non-object request bodies", () => {
    const result = runValidation([]);

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("valid JSON object");
  });
});

describe("validateBody edge cases", () => {
  test("rejects null values", () => {
    const result = runValidation({
      name: "Aditi",
      email: null
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("email cannot be null");
  });

  test("rejects whitespace-only required strings", () => {
    const result = runValidation({
      name: "   ",
      email: "aditi@example.com"
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("name cannot be empty");
  });

  test("rejects strings shorter than minimum length", () => {
    const result = runValidation({
      name: "A",
      email: "aditi@example.com"
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("name must be at least 2");
  });

  test("rejects strings exceeding maximum length", () => {
    const result = runValidation({
      name: "A".repeat(21),
      email: "aditi@example.com"
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("name cannot exceed 20 characters");
  });

  test("rejects negative numbers", () => {
    const result = runValidation({
      name: "Aditi",
      email: "aditi@example.com",
      quantity: -1
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("quantity must be at least 0");
  });

  test("rejects non-integer numbers", () => {
    const result = runValidation({
      name: "Aditi",
      email: "aditi@example.com",
      quantity: 2.5
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("quantity must be an integer");
  });

  test("rejects empty arrays when minimum items are required", () => {
    const result = runValidation({
      name: "Aditi",
      email: "aditi@example.com",
      items: []
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("items must contain at least 1 item(s)");
  });

  test("rejects unknown fields inside nested array objects", () => {
    const result = runValidation({
      name: "Aditi",
      email: "aditi@example.com",
      items: [{ product: "ABC", quantity: 2, price: 100 }]
    });

    expect(result.nextError.statusCode).toBe(400);
    expect(result.nextError.message).toContain("items[0] contains unknown fields: price");
  });

  test("trims valid string fields", () => {
    const result = runValidation({
      name: "  Aditi  ",
      email: "aditi@example.com"
    });

    expect(result.nextError).toBeUndefined();
    expect(result.req.body.name).toBe("Aditi");
  });
});
