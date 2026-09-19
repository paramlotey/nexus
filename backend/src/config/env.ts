import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(7000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
});

export const env = envSchema.parse(process.env);
