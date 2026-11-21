import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { validateEnv } from "./config/env.js";

let server;
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully...`);

  if (!server) {
    await mongoose.disconnect();
    process.exitCode = 0;
    return;
  }

  server.close(async (error) => {
    try {
      await mongoose.disconnect();
      console.log("MongoDB disconnected.");

      if (error) {
        console.error("Server shutdown error:", error.message);
        process.exitCode = 1;
      } else {
        console.log("Server closed successfully.");
      }
    } catch (disconnectError) {
      console.error("Database shutdown error:", disconnectError.message);
      process.exitCode = 1;
    }
  });
}

try {
  const config = validateEnv();

  await connectDB();

  server = app.listen(config.port, () => {
    console.log(`SupplyPulse API running on http://localhost:${config.port}`);
  });

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
} catch (error) {
  console.error("Startup failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
}
