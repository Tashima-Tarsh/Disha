import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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

export async function POST(request: NextRequest) {
  let body: { path?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { path: filePath, content } = body;
  if (!filePath || content === undefined) {
    return NextResponse.json(
      { error: "path and content are required" },
      { status: 400 }
    );
  }

  const resolvedPath = resolveWithinRoot(filePath);
  if (!resolvedPath) {
    return NextResponse.json({ error: "path is outside the workspace root" }, { status: 400 });
  }

  try {
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, content, "utf-8");
    const stats = await fs.stat(resolvedPath);
    return NextResponse.json({ success: true, size: stats.size });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
