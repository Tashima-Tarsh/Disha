import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runAgenticMission } from "@/lib/unified/agentic-executor";
import { withContext } from "@/lib/unified/api";

const agenticMissionRequestSchema = z.object({
  rawText: z.string().default(""),
  requestedAction: z.string().optional(),
  operatorInstruction: z.string().optional(),
  sensitivity: z.enum(["public", "internal", "controlled", "classified"]).default("public"),
  deviceId: z.string().optional(),
  deviceTrust: z.number().min(0).max(1).optional(),
  missionId: z.string().optional(),
  indicators: z.array(z.object({
    type: z.enum(["ip", "domain", "url", "hash", "cve", "email", "other"]),
    value: z.string(),
    source: z.string().optional(),
  })).default([]),
  locations: z.array(z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyM: z.number().nonnegative().optional(),
    label: z.string().optional(),
  })).default([]),
  dataSources: z.array(z.object({
    sourceId: z.string().min(1),
    name: z.string().min(1),
    url: z.string().url().optional(),
    sensitivity: z.enum(["public", "internal", "controlled", "classified"]).default("public"),
  })).default([]),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = agenticMissionRequestSchema.parse(await req.json());
    const result = await runAgenticMission({
      ...body,
      userId: ctx.principal.userId,
      userRole: ctx.principal.roles[0] ?? "analyst",
    });
    return NextResponse.json(result, { headers: { "X-Request-ID": ctx.requestId } });
  });
}
