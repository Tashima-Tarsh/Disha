import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireRequestContext } from "@/lib/server/security";
import { getConversationShare, revokeConversationShare } from "@/services/shares";

interface RouteContext {
  params: Promise<{ shareId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const ctx = await requireRequestContext(req, "share:read");
    const { shareId } = await params;
    const share = await getConversationShare(ctx, shareId, req.headers.get("x-share-password"));
    return NextResponse.json({
      id: share.id,
      title: share.conversation.title,
      messages: share.conversation.messages,
      model: share.conversation.model,
      createdAt: share.conversation.createdAt,
      shareCreatedAt: share.createdAt,
    });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 500;
    if (status === 401) {
      return NextResponse.json({ error: "Password required", requiresPassword: true }, { status: 401 });
    }
    return errorResponse(error, req);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const ctx = await requireRequestContext(req, "share:delete");
    const { shareId } = await params;
    const deleted = await revokeConversationShare(ctx, shareId);
    if (!deleted) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, req);
  }
}
