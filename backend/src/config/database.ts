import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(env.MONGO_URI);
  console.log("MongoDB connected");
};
