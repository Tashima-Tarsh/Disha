import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import { buildCompetingHypotheses, detectContradictions, loadEvidenceClaims } from "@/lib/unified/contradiction-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const subject = req.nextUrl.searchParams.get("subject")?.trim() ?? "";
    const predicate = req.nextUrl.searchParams.get("predicate")?.trim() ?? "";
    if (!subject || !predicate || subject.length > 500 || predicate.length > 300) {
      return NextResponse.json({ error: "subject_and_predicate_required" }, { status: 400, headers: { "X-Request-ID": ctx.requestId } });
    }
    const claims = await loadEvidenceClaims(subject, predicate);
    const sets = detectContradictions(claims);
    const hypotheses = sets.flatMap(buildCompetingHypotheses);
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      subject,
      predicate,
      claims,
      contradictionSets: sets,
      hypotheses,
    }, { headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store, max-age=0" } });
  });
}
