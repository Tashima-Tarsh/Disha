import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";

const requestSchema = z.object({
  missionId: z.string().min(1).max(128),
  adapterId: z.string().min(1).max(128),
  purpose: z.string().min(3).max(1000),
  input: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = requestSchema.parse(await req.json());
    const bus = createDefaultOsintBus({
      policyCheck: (metadata) => (metadata.executionClass ?? "passive_public") === "passive_public" || metadata.executionClass === "credentialed_public_api",
    });
    const result = await bus.run(body.adapterId, body.input, {
      missionId: body.missionId,
      userId: ctx.principal.userId,
      purpose: body.purpose,
      signal: req.signal,
    });
    await appendEvidenceEvent({
      missionId: body.missionId,
      actor: ctx.principal.userId,
      action: "governed_osint_adapter_executed",
      input: { adapterId: body.adapterId, purpose: body.purpose, input: body.input },
      output: result,
    });
    return NextResponse.json(result, {
      status: result.status === "failed" ? 400 : 200,
      headers: { "X-Request-ID": ctx.requestId },
    });
  });
}
