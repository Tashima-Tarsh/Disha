import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getEnv } from "@/lib/server/env";
import { runDueSourceJobs } from "@/lib/unified/dynamic-source-scheduler";

export async function POST(req: NextRequest) {
  const expected = getEnv().DISHA_WORKER_TOKEN;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !safeEqual(provided, expected)) return NextResponse.json({ error: "unauthorized_worker" }, { status: 401 });
  const body = await req.json().catch(() => ({})) as { maxJobs?: unknown };
  const maxJobs = typeof body.maxJobs === "number" ? Math.max(1, Math.min(100, Math.trunc(body.maxJobs))) : 10;
  const result = await runDueSourceJobs(new Date(), maxJobs);
  return NextResponse.json({ generatedAt: new Date().toISOString(), ...result });
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
