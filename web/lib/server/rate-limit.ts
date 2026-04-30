import type { NextRequest } from "next/server";
import { getEnv } from "./env";
import { getRedisClient } from "./redis";

const memory = new Map<string, number[]>();
const WINDOW_SECONDS = 60;

export async function checkRateLimit(req: NextRequest): Promise<boolean> {
  const env = getEnv();
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `rate:${forwarded ?? "local"}:${req.nextUrl.pathname}`;
  const redis = await getRedisClient();
  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    return count <= env.DISHA_WEB_RATE_LIMIT;
  }
  const now = Date.now();
  const bucket = memory.get(key)?.filter((ts) => now - ts < WINDOW_SECONDS * 1000) ?? [];
  if (bucket.length >= env.DISHA_WEB_RATE_LIMIT) {
    memory.set(key, bucket);
    return false;
  }
  bucket.push(now);
  memory.set(key, bucket);
  return true;
}
