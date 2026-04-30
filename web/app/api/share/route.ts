import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { createShareSchema } from "@/lib/server/schemas/api";
import { requireRequestContext } from "@/lib/server/security";
import { createConversationShare } from "@/services/shares";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRequestContext(req, "share:create");
    const body = createShareSchema.parse(await req.json());
    const share = await createConversationShare(ctx, body);

    const origin = req.headers.get("origin") ?? "";
    const url = `${origin}/share/${share.id}`;

    return NextResponse.json({
      id: share.id,
      conversationId: share.conversationId,
      visibility: share.visibility,
      hasPassword: !!share.passwordHash,
      expiry: share.expiry,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
      url,
    });
  } catch (error) {
    return errorResponse(error, req);
  }
}
