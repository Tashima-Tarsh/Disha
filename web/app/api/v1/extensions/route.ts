import { NextRequest, NextResponse } from "next/server";

import { listGovernedExtensionManifests } from "@/lib/extensions";
import { withContext } from "@/lib/unified/api";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json(
      {
        architecture: "governed-extension-layer",
        rule: "extension source -> adapter contract -> policy gate -> evidence ledger -> unified mission result",
        activeExtensions: listGovernedExtensionManifests().filter((extension) => extension.maturity === "active"),
        plannedExtensions: listGovernedExtensionManifests().filter((extension) => extension.maturity !== "active"),
      },
      { headers: { "X-Request-ID": ctx.requestId } },
    ),
  );
}
