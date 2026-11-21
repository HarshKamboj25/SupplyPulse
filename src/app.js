import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN?.trim();
if (process.env.NODE_ENV === "production" && !clientOrigin) {
  throw new Error("CLIENT_ORIGIN must be configured in production.");
}

app.use(helmet());
app.use(cors({ origin: clientOrigin || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get("/", (_req, res) => {
  res.json({ success: true, name: "SupplyPulse API", version: "1.0.0" });
});

app.use("/api/v1", routes);
app.use(notFound);
app.use(errorHandler);

export default app;
