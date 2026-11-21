const allowedEnvironments = ["development", "test", "production"];

export function validateEnv() {
  const errors = [];
  const environment = process.env.NODE_ENV || "development";
  const port = Number(process.env.PORT || 5000);
  const mongoUri = process.env.MONGODB_URI?.trim();
  const jwtSecret = process.env.JWT_SECRET;
  const clientOrigin = process.env.CLIENT_ORIGIN?.trim();

  if (!allowedEnvironments.includes(environment)) {
    errors.push("NODE_ENV must be development, test, or production.");
  }

  let validMongoUri = false;
  try {
    const parsed = new URL(mongoUri || "");
    validMongoUri = ["mongodb:", "mongodb+srv:"].includes(parsed.protocol) && Boolean(parsed.hostname) && !(parsed.protocol === "mongodb+srv:" && parsed.port);
  } catch {
    validMongoUri = false;
  }

  if (!validMongoUri) {
    errors.push("MONGODB_URI must be a valid MongoDB connection URI.");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push("PORT must be an integer between 1 and 65535.");
  }

  if (!jwtSecret || !jwtSecret.trim() || jwtSecret.length < 32) {
    errors.push("JWT_SECRET must contain at least 32 characters.");
  }

  if (environment === "production") {
    if (!clientOrigin || clientOrigin === "*") {
      errors.push("CLIENT_ORIGIN must be explicitly configured in production.");
    } else {
      try {
        const url = new URL(clientOrigin);
        if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || url.origin !== clientOrigin) {
          errors.push("CLIENT_ORIGIN must use HTTPS in production.");
        }
      } catch {
        errors.push("CLIENT_ORIGIN must be a valid URL.");
      }
    }

    if (
      jwtSecret &&
      (/replace|placeholder|change.?me|example|your.?secret/i.test(jwtSecret) ||
        jwtSecret.length < 48)
    ) {
      errors.push("Production JWT_SECRET must be a strong, non-placeholder secret of at least 48 characters.");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n- ${errors.join("\n- ")}`);
  }

  return { port, environment, clientOrigin };
}
