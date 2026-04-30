import fs from "fs/promises";
import path from "node:path";
import { audit } from "@/lib/server/audit";
import { resolveWorkspacePath } from "@/lib/server/security";
import type { RequestContext } from "@/lib/server/types";

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
};

export async function readWorkspaceFile(ctx: RequestContext, filePath: string) {
  const resolvedPath = resolveWorkspacePath(filePath);
  const stats = await fs.stat(resolvedPath);
  if (stats.isDirectory()) throw Object.assign(new Error("path is a directory"), { status: 400 });
  if (stats.size > 2_000_000) throw Object.assign(new Error("file too large"), { status: 413 });

  const ext = resolvedPath.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ext in IMAGE_MIME;
  const raw = await fs.readFile(resolvedPath, isImage ? undefined : "utf-8");
  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "file.read",
    resource: filePath,
    outcome: "success",
    metadata: { size: stats.size },
  });

  return {
    content: isImage ? `data:${IMAGE_MIME[ext]};base64,${Buffer.from(raw).toString("base64")}` : raw,
    isImage: isImage || ext === "svg",
    size: stats.size,
    modified: stats.mtime.toISOString(),
  };
}

export async function writeWorkspaceFile(ctx: RequestContext, filePath: string, content: string) {
  const resolvedPath = resolveWorkspacePath(filePath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, content, "utf-8");
  const stats = await fs.stat(resolvedPath);
  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "file.write",
    resource: filePath,
    outcome: "success",
    metadata: { size: stats.size },
  });
  return { success: true, size: stats.size };
}
