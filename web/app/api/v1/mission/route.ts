import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runMission } from "@/lib/unified/orchestrator";
import { withContext } from "@/lib/unified/api";

const missionRequestSchema = z.object({
  rawText: z.string().max(20_000).default(""),
  requestedAction: z.string().max(2_000).optional(),
  sensitivity: z.enum(["public", "internal", "controlled", "classified"]).default("public"),
  deviceId: z.string().optional(),
  deviceTrust: z.number().min(0).max(1).optional(),
  missionId: z.string().max(128).optional(),
  indicators: z.array(z.object({
    type: z.enum(["ip", "domain", "url", "hash", "cve", "email", "other"]),
    value: z.string().max(2_000),
    source: z.string().max(512).optional(),
  })).max(100).default([]),
  locations: z.array(z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyM: z.number().nonnegative().optional(),
    label: z.string().max(512).optional(),
  })).max(100).default([]),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = missionRequestSchema.parse(await req.json());
    const result = await runMission({
      ...body,
      userId: ctx.principal.userId,
      userRole: ctx.principal.roles[0] ?? "analyst",
    });
    return NextResponse.json(result, { headers: { "X-Request-ID": ctx.requestId } });
  });
}
