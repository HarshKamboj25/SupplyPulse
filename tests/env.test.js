import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import { validateEnv } from "../src/config/env.js";

const envKeys = [
  "NODE_ENV",
  "PORT",
  "MONGODB_URI",
  "JWT_SECRET",
  "CLIENT_ORIGIN"
];

const originalEnv = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key]])
);

function setValidEnvironment(environment = "development") {
  process.env.NODE_ENV = environment;
  process.env.PORT = "5000";
  process.env.MONGODB_URI = "mongodb://localhost:27017/supplypulse";
  process.env.JWT_SECRET = "test-secret-with-more-than-32-characters";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";
}

describe("Environment configuration validation", () => {
  beforeEach(() => {
    setValidEnvironment();
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  test("accepts valid development configuration", () => {
    expect(validateEnv()).toEqual({
      port: 5000,
      environment: "development",
      clientOrigin: "http://localhost:5173"
    });
  });

  test("rejects missing MongoDB URI", () => {
    delete process.env.MONGODB_URI;

    expect(() => validateEnv()).toThrow("MONGODB_URI");
  });

  test("rejects invalid MongoDB URI", () => {
    process.env.MONGODB_URI = "https://example.com/database";

    expect(() => validateEnv()).toThrow("MONGODB_URI");
  });

  test("rejects missing JWT secret", () => {
    delete process.env.JWT_SECRET;

    expect(() => validateEnv()).toThrow("JWT_SECRET");
  });

  test("rejects weak JWT secret", () => {
    process.env.JWT_SECRET = "short-secret";

    expect(() => validateEnv()).toThrow("JWT_SECRET");
  });

  test("rejects invalid PORT values", () => {
    process.env.PORT = "70000";

    expect(() => validateEnv()).toThrow("PORT");
  });

  test("rejects non-numeric PORT values", () => {
    process.env.PORT = "invalid";

    expect(() => validateEnv()).toThrow("PORT");
  });

  test("rejects unsupported NODE_ENV", () => {
    process.env.NODE_ENV = "staging";

    expect(() => validateEnv()).toThrow("NODE_ENV");
  });

  test("rejects missing CLIENT_ORIGIN in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CLIENT_ORIGIN;

    expect(() => validateEnv()).toThrow("CLIENT_ORIGIN");
  });

  test("rejects HTTP origin in production", () => {
    setValidEnvironment("production");
    process.env.CLIENT_ORIGIN = "http://example.com";
    process.env.JWT_SECRET = "a".repeat(64);

    expect(() => validateEnv()).toThrow("HTTPS");
  });

  test("rejects wildcard origin in production", () => {
    setValidEnvironment("production");
    process.env.CLIENT_ORIGIN = "*";
    process.env.JWT_SECRET = "a".repeat(64);

    expect(() => validateEnv()).toThrow("CLIENT_ORIGIN");
  });

  test("rejects weak production JWT secret", () => {
    setValidEnvironment("production");
    process.env.JWT_SECRET = "a".repeat(40);
    process.env.CLIENT_ORIGIN = "https://example.com";

    expect(() => validateEnv()).toThrow("strong");
  });

  test("accepts valid production configuration", () => {
    setValidEnvironment("production");
    process.env.JWT_SECRET = "a".repeat(64);
    process.env.CLIENT_ORIGIN = "https://example.com";

    expect(validateEnv()).toEqual({
      port: 5000,
      environment: "production",
      clientOrigin: "https://example.com"
    });
  });
});

  test('rejects whitespace-only JWT secret', () => {
    process.env.JWT_SECRET = '                                ';
    expect(() => validateEnv()).toThrow('JWT_SECRET');
  });

  test('rejects malformed MongoDB URI', () => {
    process.env.MONGODB_URI = 'mongodb://';
    expect(() => validateEnv()).toThrow('MONGODB_URI');
  });

  test('rejects production origin containing a path', () => {
    setValidEnvironment('production');
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.CLIENT_ORIGIN = 'https://example.com/dashboard';
    expect(() => validateEnv()).toThrow('CLIENT_ORIGIN');
  });

  test('rejects production origin containing query and hash', () => {
    setValidEnvironment('production');
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.CLIENT_ORIGIN = 'https://example.com/?test=1#section';
    expect(() => validateEnv()).toThrow('CLIENT_ORIGIN');
  });
