import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
};
const DEFAULT_ROOT = process.env.AGCLAW_WEB_ROOT
  ? path.resolve(process.env.AGCLAW_WEB_ROOT)
  : path.resolve(process.cwd(), "..");

function resolveWithinRoot(relativePath: string) {
  const absolutePath = path.resolve(DEFAULT_ROOT, relativePath);
  const relativeToRoot = path.relative(DEFAULT_ROOT, absolutePath);
  if (
    relativeToRoot === ".." ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot)
  ) {
    return null;
  }
  return absolutePath;
}

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "path parameter required" }, { status: 400 });
  }

  const resolvedPath = resolveWithinRoot(filePath);
  if (!resolvedPath) {
    return NextResponse.json({ error: "path is outside the workspace root" }, { status: 400 });
  }

  try {
    const stats = await fs.stat(resolvedPath);
    if (stats.isDirectory()) {
      return NextResponse.json({ error: "path is a directory" }, { status: 400 });
    }

    const ext = resolvedPath.split(".").pop()?.toLowerCase() ?? "";

    // Binary images: return base64 data URL
    if (ext in IMAGE_MIME) {
      const buffer = await fs.readFile(resolvedPath);
      const base64 = buffer.toString("base64");
      return NextResponse.json({
        content: `data:${IMAGE_MIME[ext]};base64,${base64}`,
        isImage: true,
        size: stats.size,
        modified: stats.mtime.toISOString(),
      });
    }

    // Text (including SVG)
    const content = await fs.readFile(resolvedPath, "utf-8");
    return NextResponse.json({
      content,
      isImage: ext === "svg",
      size: stats.size,
      modified: stats.mtime.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
