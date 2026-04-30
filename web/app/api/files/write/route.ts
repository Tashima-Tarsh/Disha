import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { fileWriteSchema } from "@/lib/server/schemas/api";
import { requireRequestContext } from "@/lib/server/security";
import { writeWorkspaceFile } from "@/services/filesystem";

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRequestContext(request, "file:write");
    const body = fileWriteSchema.parse(await request.json());
    return NextResponse.json(await writeWorkspaceFile(ctx, body.path, body.content));
  } catch (error) {
    return errorResponse(error, request);
  }
}
