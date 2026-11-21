import mongoose from "mongoose";

let connectionPromise;

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing. Add it to your .env file.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    }).then(() => {
      console.log("MongoDB connected");
      return mongoose;
    }).catch((error) => {
      connectionPromise = undefined;

      throw new Error(
        "MongoDB connection failed. Verify database availability and credentials.",
        { cause: error }
      );
    });
  }

  return connectionPromise;
}
