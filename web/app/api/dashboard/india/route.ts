import { NextResponse } from "next/server";

import { clamp, territories } from "@/lib/india-dashboard-data";

export const dynamic = "force-dynamic";

export function GET() {
  const now = Date.now();
  const tick = Math.floor(now / 12000);
  const scan = territories.map((territory, index) => {
    const wave = ((tick + index * 3) % 9) - 4;
    const evidenceWave = ((tick * 2 + index) % 7) - 3;
    const cases = Math.max(1, territory.cases + wave);
    const evidence = clamp(territory.evidence + evidenceWave, 42, 94);
    const approval = Math.max(0, territory.approval + (wave > 1 ? 1 : 0));
    const closure = clamp(100 - Math.round(cases * 1.15) + Math.round(evidence / 4), 18, 94);
    const agenticScan = {
      posture:
        territory.priority === "Critical"
          ? "Escalated review"
          : territory.priority === "High"
            ? "Active verification"
            : "Routine scan",
      nextAction:
        evidence < 65
          ? "Source review"
          : approval > 5
            ? "Human approval"
            : "Evidence bundle",
      confidenceBand: evidence >= 78 ? "Strong" : evidence >= 65 ? "Review" : "Weak",
    };

    return {
      ...territory,
      cases,
      evidence,
      approval,
      closure,
      agenticScan,
    };
  });

  return NextResponse.json({
    generatedAt: new Date(now).toISOString(),
    scanId: `DISHA-IN-${tick}`,
    sourceNotice:
      "Demo operational feed for product evaluation. Not a government statistic.",
    scan,
  });
}
