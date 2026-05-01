import { getEnv } from "./env";

export async function brainFetch(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const env = getEnv();
  if (!env.DISHA_BRAIN_URL || !env.DISHA_BRAIN_API_TOKEN) {
    throw Object.assign(new Error("DISHA Brain client is not configured"), { status: 503 });
  }
  const url = new URL(path, env.DISHA_BRAIN_URL).toString();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${env.DISHA_BRAIN_API_TOKEN}`);
  const timeoutMs = init.timeoutMs ?? 10_000;
  const { timeoutMs: _ignored, ...rest } = init;
  return fetch(url, { ...rest, headers, signal: AbortSignal.timeout(timeoutMs) });
}

