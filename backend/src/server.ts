import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { connectRedis } from "./config/redis.js";

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    await connectRedis();

    app.listen(env.PORT, () => {
      console.log(`WorkSpace API running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

void startServer();
