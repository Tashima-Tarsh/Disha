import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { buildCompetingHypotheses, detectContradictions, persistHypothesis } from "@/lib/unified/contradiction-engine";

const claimSchema = z.object({
  claimId: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  predicate: z.string().min(1).max(500),
  value: z.union([z.string(), z.number(), z.boolean()]),
  confidence: z.number().min(0).max(1),
  sourceId: z.string().min(1).max(200),
  sourceHash: z.string().min(8).max(256),
  lineageId: z.string().min(1).max(256).optional(),
  sourceReliability: z.number().min(0).max(1).optional(),
  observedAt: z.string().datetime().optional(),
  publishedAt: z.string().datetime().optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  unit: z.string().max(64).optional(),
  geography: z.string().max(300).optional(),
  definition: z.string().max(1000).optional(),
  numericTolerance: z.number().min(0).max(1).optional(),
});
const requestSchema = z.object({ claims: z.array(claimSchema).min(1).max(1000), persistHypotheses: z.boolean().default(false) });

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const parsed = requestSchema.parse(await req.json());
    const sets = detectContradictions(parsed.claims);
    const hypotheses = sets.flatMap((set) => buildCompetingHypotheses(set));
    if (parsed.persistHypotheses) await Promise.all(hypotheses.map((hypothesis) => persistHypothesis(hypothesis)));
    return NextResponse.json({ sets, hypotheses }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}
