import request from "supertest";
import app from "../src/app.js";

describe("SupplyPulse health", () => {
  test("GET /api/v1/health returns healthy", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("healthy");
  });
});
