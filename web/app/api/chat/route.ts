import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { chatRequestSchema } from "@/lib/server/schemas/api";
import { requireRequestContext } from "@/lib/server/security";
import { proxyChat } from "@/services/chat";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRequestContext(req, "chat");
    const body = chatRequestSchema.parse(await req.json());
    return proxyChat(ctx, body);
  } catch (error) {
    return errorResponse(error, req);
  }
}
