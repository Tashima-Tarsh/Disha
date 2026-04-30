import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { exportRequestSchema } from "@/lib/server/schemas/api";
import { requireRequestContext } from "@/lib/server/security";
import { exportConversation } from "@/services/export";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRequestContext(req, "export");
    const body = exportRequestSchema.parse(await req.json());
    const result = await exportConversation(ctx, body.conversation, body.options);

    return new NextResponse(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.mime,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    return errorResponse(error, req);
  }
}
