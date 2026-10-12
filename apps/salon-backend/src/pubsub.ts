import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Poseban klijent za publish (deli se sa cache redis-om)
export const publisher = createClient({ url: REDIS_URL });

publisher.on("error", (err: Error) => {
  console.error("Publisher Redis error:", err);
});

let connected = false;

export async function ensurePublisher() {
  if (!connected) {
    await publisher.connect();
    connected = true;
    console.log("Publisher connected to Redis");
  }
}

export const CHANNELS = {
  RESERVATION_CREATED: "reservation.created",
  RESERVATION_UPDATED: "reservation.updated",
  RESERVATION_CANCELLED: "reservation.cancelled",
} as const;

export async function publish(channel: string, payload: object) {
  await publisher.publish(channel, JSON.stringify(payload));
}
