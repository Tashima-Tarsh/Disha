import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

const MAX_DEPTH = 3;
const MAX_ENTRIES_PER_DIR = 200;
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

async function listDirectory(absolutePath: string, relativePath: string, depth: number): Promise<FileNode[]> {
  if (depth > MAX_DEPTH) {
    return [];
  }

  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  const sorted = entries
    .filter((entry) => !entry.name.startsWith(".next") && entry.name !== "node_modules")
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_ENTRIES_PER_DIR);

  const children = await Promise.all(
    sorted.map(async (entry) => {
      const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: childRelativePath,
          type: "directory" as const,
          children: await listDirectory(path.join(absolutePath, entry.name), childRelativePath, depth + 1),
        };
      }

      return {
        name: entry.name,
        path: childRelativePath,
        type: "file" as const,
      };
    })
  );

  return children;
}

export async function GET(request: NextRequest) {
  const requestedPath = request.nextUrl.searchParams.get("path") ?? "";
  const absolutePath = resolveWithinRoot(requestedPath);

  if (!absolutePath) {
    return NextResponse.json({ error: "Path is outside the allowed root" }, { status: 400 });
  }

  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isDirectory()) {
      return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
    }

    const entries = await listDirectory(absolutePath, requestedPath.replace(/\\/g, "/"), 0);
    return NextResponse.json({
      root: requestedPath.replace(/\\/g, "/"),
      absoluteRoot: absolutePath,
      entries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
