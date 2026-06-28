import { NextResponse } from "next/server";

import { lensRegistry } from "@/lib/unified/lenses";
import { openDataSources } from "@/lib/unified/data-integration";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    product: "DISHA v6.6 Unified Policy-Gated Cognitive Intelligence OS",
    lenses: Object.keys(lensRegistry),
    openDataSources: openDataSources.length,
    policyGate: "enabled",
    evidenceLedger: "enabled",
  });
}
