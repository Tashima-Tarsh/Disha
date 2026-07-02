import { NextResponse } from "next/server";

import { lensRegistry } from "@/lib/unified/lenses";
import { openDataSources } from "@/lib/unified/data-integration";
import { listAgentSkills } from "@/lib/unified/agentic-readiness";
import { getEnv } from "@/lib/server/env";
import { listSourceRegistry } from "@/lib/unified/source-registry";

export async function GET() {
  const env = getEnv();
  return NextResponse.json({
    status: "ok",
    product: "DISHA v6.6 Unified Policy-Gated Cognitive Intelligence OS",
    lenses: Object.keys(lensRegistry),
    agenticSkills: listAgentSkills().length,
    openDataSources: openDataSources.length,
    policyGate: "enabled",
    evidenceLedger: "enabled",
    agenticMission: "enabled",
    modelProvider: env.DISHA_MODEL_PROVIDER,
    learningMemory: "evidence_memory",
    sourceRegistry: listSourceRegistry().length,
    noDemoDataPolicy: "enabled",
  });
}
