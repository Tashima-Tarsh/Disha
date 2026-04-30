import { createClient, type RedisClientType } from "redis";
import { getEnv } from "./env";

let clientPromise: Promise<RedisClientType> | null | undefined;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (clientPromise !== undefined) return clientPromise;
  const { REDIS_URL } = getEnv();
  if (!REDIS_URL) {
    clientPromise = null;
    return null;
  }
  clientPromise = createClient({ url: REDIS_URL }).connect() as Promise<RedisClientType>;
  return clientPromise;
}
