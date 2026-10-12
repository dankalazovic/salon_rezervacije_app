import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = createClient({ url: REDIS_URL });

redis.on("error", (err: Error) => {
  console.error("Redis Client Error", err);
});

let connected = false;

export async function ensureRedis() {
  if (!connected) {
    await redis.connect();
    connected = true;
    console.log("Connected to Redis");
  }
}