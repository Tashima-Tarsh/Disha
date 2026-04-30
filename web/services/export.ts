import type { Conversation, ExportOptions } from "@/lib/types";
import { toHTML } from "@/lib/export/html";
import { toJSON } from "@/lib/export/json";
import { toMarkdown } from "@/lib/export/markdown";
import { toPlainText } from "@/lib/export/plaintext";
import { audit } from "@/lib/server/audit";
import type { RequestContext } from "@/lib/server/types";

export const EXPORT_MIME: Record<string, string> = {
  markdown: "text/markdown; charset=utf-8",
  json: "application/json",
  html: "text/html; charset=utf-8",
  plaintext: "text/plain; charset=utf-8",
};

const EXT: Record<string, string> = {
  markdown: "md",
  json: "json",
  html: "html",
  plaintext: "txt",
};

export async function exportConversation(ctx: RequestContext, conversation: Conversation, options: ExportOptions) {
  if (JSON.stringify(conversation).length > 500_000) {
    throw Object.assign(new Error("Conversation too large"), { status: 413 });
  }
  if (options.format === "pdf") {
    throw Object.assign(new Error("PDF export is handled client-side"), { status: 400 });
  }
  const content =
    options.format === "markdown"
      ? toMarkdown(conversation, options)
      : options.format === "json"
        ? toJSON(conversation, options)
        : options.format === "html"
          ? toHTML(conversation, options)
          : toPlainText(conversation, options);

  const slug = conversation.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "conversation.export",
    resource: conversation.id,
    outcome: "success",
    metadata: { format: options.format },
  });

  return {
    content,
    filename: `${slug || "conversation"}.${EXT[options.format]}`,
    mime: EXPORT_MIME[options.format],
  };
}
