import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { evidenceEventSchema } from "@/lib/unified/contracts";
import { verifyEvidenceChain } from "@/lib/unified/evidence-ledger";
import { withContext } from "@/lib/unified/api";

const schema = z.object({
  events: z.array(evidenceEventSchema),
});

export async function POST(req: NextRequest) {
  return withContext(req, "audit:read", async (ctx) => {
    const { events } = schema.parse(await req.json());
    return NextResponse.json(verifyEvidenceChain(events), { headers: { "X-Request-ID": ctx.requestId } });
  });
}
