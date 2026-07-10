import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { listScheduledSourceJobs, runScheduledSourceIngestion } from "@/lib/unified/scheduled-source-ingestion";

const ingestionRunSchema = z.object({
  missionId: z.string().min(1).max(128).optional(),
  sourceIds: z.array(z.string().min(1).max(128)).max(20).optional(),
});

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json({
      jobs: listScheduledSourceJobs(),
      publicationRule: "Scheduled source jobs record official-source availability and parser readiness. They do not publish factual dashboard values without claim-level provenance.",
    }, { headers: { "X-Request-ID": ctx.requestId } }));
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = ingestionRunSchema.parse(await req.json());
    const summary = await runScheduledSourceIngestion({ sourceIds: body.sourceIds });
    const missionId = body.missionId ?? `source-ingestion-${summary.generatedAt}`;
    const evidence = await appendEvidenceEvent({
      missionId,
      actor: ctx.principal.userId,
      action: "scheduled_source_ingestion_completed",
      input: body,
      output: summary,
    });

    return NextResponse.json({
      ...summary,
      missionId,
      evidenceEventId: evidence.eventId,
    }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}
