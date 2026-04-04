"use client";

import { useMemo, useState } from "react";
import { Check, MessageSquareText, X } from "lucide-react";
import { useCollaborationContext } from "./CollaborationProvider";
import { cn } from "@/lib/utils";

interface AnnotationThreadProps {
  messageId: string;
  onClose: () => void;
}

function formatTimestamp(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function AnnotationThread({ messageId, onClose }: AnnotationThreadProps) {
  const { annotations, addAnnotation, resolveAnnotation, replyAnnotation } = useCollaborationContext();
  const [draft, setDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const thread = useMemo(() => annotations[messageId] ?? [], [annotations, messageId]);

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-950 shadow-lg">
      <div className="flex items-center justify-between border-b border-surface-800 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-surface-100">
          <MessageSquareText className="h-4 w-4 text-brand-400" aria-hidden="true" />
          Comments
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200"
          aria-label="Close comments"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto p-3">
        {thread.map((annotation) => (
          <div key={annotation.id} className="rounded-md border border-surface-800 bg-surface-900/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-surface-100">{annotation.author.name}</div>
                <div className="text-xs text-surface-500">{formatTimestamp(annotation.createdAt)}</div>
              </div>
              <button
                onClick={() => resolveAnnotation(annotation.id, !annotation.resolved)}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                  annotation.resolved
                    ? "bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50"
                    : "bg-surface-800 text-surface-300 hover:bg-surface-700"
                )}
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {annotation.resolved ? "Resolved" : "Resolve"}
              </button>
            </div>
            <p className="mt-2 text-sm text-surface-200">{annotation.text}</p>

            {annotation.replies.length > 0 && (
              <div className="mt-3 space-y-2 border-l border-surface-700 pl-3">
                {annotation.replies.map((reply) => (
                  <div key={reply.id}>
                    <div className="text-xs font-medium text-surface-300">{reply.author.name}</div>
                    <div className="text-xs text-surface-500">{formatTimestamp(reply.createdAt)}</div>
                    <p className="mt-1 text-sm text-surface-200">{reply.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <input
                value={replyDrafts[annotation.id] ?? ""}
                onChange={(e) =>
                  setReplyDrafts((current) => ({
                    ...current,
                    [annotation.id]: e.target.value,
                  }))
                }
                placeholder="Reply"
                className="min-w-0 flex-1 rounded-md border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
              />
              <button
                onClick={() => {
                  const value = (replyDrafts[annotation.id] ?? "").trim();
                  if (!value) return;
                  replyAnnotation(annotation.id, value);
                  setReplyDrafts((current) => ({ ...current, [annotation.id]: "" }));
                }}
                className="rounded-md bg-surface-800 px-3 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-700"
              >
                Send
              </button>
            </div>
          </div>
        ))}

        {thread.length === 0 && (
          <div className="rounded-md border border-dashed border-surface-700 p-3 text-sm text-surface-500">
            No comments yet for this message.
          </div>
        )}
      </div>

      <div className="border-t border-surface-800 p-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment"
            className="min-w-0 flex-1 rounded-md border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
          />
          <button
            onClick={() => {
              const value = draft.trim();
              if (!value) return;
              addAnnotation(messageId, value);
              setDraft("");
            }}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
