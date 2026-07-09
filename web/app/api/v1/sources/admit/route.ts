import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { admitSourceForOperation, listOperationalSecuritySources } from "@/lib/unified/source-registry";

const admissionSchema = z.object({
  missionId: z.string().min(1).optional(),
  sourceReference: z.string().min(1).max(2048),
});

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json({
      sources: listOperationalSecuritySources(),
      rule: "Only registered official/public security sources may be operated automatically. Leak dumps and credential material are blocked.",
    }, { headers: { "X-Request-ID": ctx.requestId } }),
  );
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const body = admissionSchema.parse(await req.json());
    const admission = admitSourceForOperation(body.sourceReference);
    if (body.missionId) {
      await appendEvidenceEvent({
        missionId: body.missionId,
        actor: ctx.principal.userId,
        action: "source_admission_evaluated",
        input: body,
        output: admission,
      });
    }
    return NextResponse.json({ admission }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}
