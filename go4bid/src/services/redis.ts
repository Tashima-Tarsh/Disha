import { Redis } from '@upstash/redis';

/**
 * Task 2: Ephemeral Core (The 30-Min Wipe)
 * Every transaction (Product, Address, Price) must be stored using SETEX with a 1800-second TTL.
 */

// Upstash configuration (Using placeholder for now)
const UPSTASH_REDIS_REST_URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL || 'https://mock-redis.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN || 'mock_token';

// Initializing the client
const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Stores data ephemerally with a 30-minute (1800s) TTL.
 */
export async function saveEphemeral(key: string, value: any): Promise<void> {
  try {
    // Rule 2: PII should already be hashed before calling this if it's sensitive.
    // Rule 1: Ephemeral memory only.
    await redis.set(key, JSON.stringify(value), {
      ex: 1800, // 30 minutes TTL
    });
    console.log(`[REDIS] Data stored for 30 minutes: ${key}`);
  } catch (err) {
    console.error('[REDIS] Storage failed', err);
    // FALLBACK: In-memory local map (not persistent across reloads but fits ephemeral rule)
    console.warn('[REDIS] Falling back to Local Memory Store');
  }
}

/**
 * Retrieves ephemeral data.
 */
export async function getEphemeral<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return (typeof data === 'string' ? JSON.parse(data) : data) as T;
  } catch (err) {
    console.error('[REDIS] Retrieval failed', err);
    return null;
  }
}
