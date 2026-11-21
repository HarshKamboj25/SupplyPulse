import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from "@jest/globals";

const originalMongoUri = process.env.MONGODB_URI;

const mockMongoose = {
  connection: { readyState: 0 },
  connect: jest.fn()
};

jest.unstable_mockModule("mongoose", () => ({
  default: mockMongoose
}));

let connectDB;

beforeEach(async () => {
  jest.resetModules();

  mockMongoose.connect.mockReset();
  mockMongoose.connection.readyState = 0;

  ({ connectDB } = await import("../src/config/db.js"));
});

afterEach(() => {
  if (originalMongoUri === undefined) {
    delete process.env.MONGODB_URI;
  } else {
    process.env.MONGODB_URI = originalMongoUri;
  }
});

describe("MongoDB connection", () => {
  test("rejects when MongoDB URI is missing", async () => {
    delete process.env.MONGODB_URI;

    await expect(connectDB()).rejects.toThrow("MONGODB_URI is missing");
    expect(mockMongoose.connect).not.toHaveBeenCalled();
  });

  test("returns existing Mongoose connection when already connected", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/supplypulse";
    mockMongoose.connection.readyState = 1;

    const result = await connectDB();

    expect(result).toBe(mockMongoose);
    expect(mockMongoose.connect).not.toHaveBeenCalled();
  });

  test("connects using configured MongoDB URI and timeouts", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/supplypulse";
    mockMongoose.connect.mockResolvedValue(mockMongoose);

    const result = await connectDB();

    expect(result).toBe(mockMongoose);
    expect(mockMongoose.connect).toHaveBeenCalledWith(
      "mongodb://localhost:27017/supplypulse",
      {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      }
    );
  });

  test("hides underlying connection error details", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/supplypulse";
    mockMongoose.connect.mockRejectedValue(
      new Error("Sensitive database connection details")
    );

    await expect(connectDB()).rejects.toThrow(
      "MongoDB connection failed. Verify database availability and credentials."
    );

    expect(mockMongoose.connect).toHaveBeenCalledTimes(1);
  });

  test("reuses an in-progress connection attempt", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/supplypulse";

    let resolveConnection;

    mockMongoose.connect.mockReturnValue(
      new Promise((resolve) => {
        resolveConnection = resolve;
      })
    );

    const firstAttempt = connectDB();
    const secondAttempt = connectDB();

    expect(mockMongoose.connect).toHaveBeenCalledTimes(1);

    resolveConnection(mockMongoose);

    const results = await Promise.all([firstAttempt, secondAttempt]);

    expect(results).toEqual([mockMongoose, mockMongoose]);
  });
});
