import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { probeSources } from "@/lib/unified/source-registry";

const probeSchema = z.object({
  missionId: z.string().min(1),
  sourceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const body = probeSchema.parse(await req.json());
    const probes = await probeSources(body.sourceId);
    appendEvidenceEvent({
      missionId: body.missionId,
      actor: ctx.principal.userId,
      action: "source_registry_probe_completed",
      input: body,
      output: probes,
    });
    return NextResponse.json({ probes }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}
