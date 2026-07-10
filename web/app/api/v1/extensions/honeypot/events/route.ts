import { NextRequest, NextResponse } from "next/server";

import { ingestOwnedHoneypotEvent, ownedHoneypotEventSchema } from "@/lib/extensions/honeypot-evidence";
import { withContext } from "@/lib/unified/api";

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = ownedHoneypotEventSchema.parse(await req.json());
    const result = await ingestOwnedHoneypotEvent(body, ctx.principal.userId, ctx.principal.roles[0] ?? "operator");
    return NextResponse.json(result, { headers: { "X-Request-ID": ctx.requestId } });
  });
}
