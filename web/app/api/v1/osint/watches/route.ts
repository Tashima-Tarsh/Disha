import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createContinuousOsintWatch,
  listContinuousOsintCapabilities,
  listContinuousOsintWatches,
  validateContinuousOsintInput,
} from "@/lib/unified/continuous-osint";
import { withContext } from "@/lib/unified/api";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  missionId: z.string().trim().min(1).max(128).optional(),
  adapterId: z.string().trim().min(1).max(128),
  purpose: z.string().trim().min(3).max(1000),
  input: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().optional(),
  reviewOnChange: z.boolean().optional(),
  intervalSeconds: z.coerce.number().int().optional(),
  jitterSeconds: z.coerce.number().int().optional(),
  nextRunAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const limit = Math.max(1, Math.min(1000, Number(req.nextUrl.searchParams.get("limit") ?? 200)));
    return NextResponse.json({
      watches: await listContinuousOsintWatches(ctx.principal.userId, limit),
      capabilities: listContinuousOsintCapabilities(),
      safetyRule: "Continuous OSINT is limited to governed passive/public adapters and explicit watch targets. No active reconnaissance, credential access, covert tracking, leaked data, or private-source enumeration.",
    }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = createSchema.parse(await req.json());
    const input = validateContinuousOsintInput(body.adapterId, body.input);
    const watch = await createContinuousOsintWatch({
      userId: ctx.principal.userId,
      missionId: body.missionId,
      adapterId: body.adapterId,
      purpose: body.purpose,
      input,
      enabled: body.enabled,
      reviewOnChange: body.reviewOnChange,
      intervalSeconds: body.intervalSeconds,
      jitterSeconds: body.jitterSeconds,
      nextRunAt: body.nextRunAt,
    });
    return NextResponse.json(watch, { status: 201, headers: { "X-Request-ID": ctx.requestId } });
  });
}
