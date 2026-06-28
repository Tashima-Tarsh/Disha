import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { exportEvidenceReport } from "@/lib/unified/evidence-ledger";
import { withContext } from "@/lib/unified/api";

const exportSchema = z.object({
  missionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  return withContext(req, "export", async (ctx) => {
    const { missionId } = exportSchema.parse(await req.json());
    return NextResponse.json(exportEvidenceReport(missionId), { headers: { "X-Request-ID": ctx.requestId } });
  });
}
