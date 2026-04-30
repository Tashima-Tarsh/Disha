import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { fileReadSchema } from "@/lib/server/schemas/api";
import { requireRequestContext } from "@/lib/server/security";
import { readWorkspaceFile } from "@/services/filesystem";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRequestContext(request, "file:read");
    const parsed = fileReadSchema.parse({ path: request.nextUrl.searchParams.get("path") });
    return NextResponse.json(await readWorkspaceFile(ctx, parsed.path));
  } catch (error) {
    return errorResponse(error, request);
  }
}
