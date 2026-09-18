import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { resolveAndUpsertEntity, resolveEntity } from "@/lib/unified/entity-resolution";

const identifierSchema = z.object({ namespace: z.string().min(1).max(120), value: z.string().min(1).max(500), confidence: z.number().min(0).max(1).optional(), sourceHash: z.string().min(8).max(256).optional() });
const candidateSchema = z.object({
  entityType: z.string().min(1).max(120), displayName: z.string().min(1).max(500), aliases: z.array(z.string().min(1).max(500)).max(100).optional(),
  identifiers: z.array(identifierSchema).max(100).optional(), attributes: z.record(z.string(), z.unknown()).optional(), observedAt: z.string().datetime().optional(), sourceHashes: z.array(z.string().min(8).max(256)).max(100).optional(),
});
const requestSchema = z.object({ candidate: candidateSchema, commit: z.boolean().default(false) });

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const { candidate, commit } = requestSchema.parse(await req.json());
    const result = commit ? await resolveAndUpsertEntity(candidate) : { resolution: await resolveEntity(candidate) };
    return NextResponse.json(result, { headers: { "X-Request-ID": ctx.requestId } });
  });
}
