import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, inject } from "vitest";

const mongoUri = inject("mongoUri");

process.env.NODE_ENV = "test";
process.env.PORT = "5001";
process.env.MONGODB_URI = mongoUri;

process.env.JWT_ACCESS_SECRET = "test-access-secret-123456789012345678901234";

process.env.JWT_REFRESH_SECRET = "test-refresh-secret-1234567890123456789012";

process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
});

afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections);

  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
