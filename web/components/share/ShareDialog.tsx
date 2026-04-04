"use client";

import { useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { useNotificationStore } from "@/lib/notifications";
import type { ShareExpiry, ShareVisibility } from "@/lib/share-store";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
}

const VISIBILITY_OPTIONS: ShareVisibility[] = ["public", "unlisted", "password"];
const EXPIRY_OPTIONS: ShareExpiry[] = ["1h", "24h", "7d", "30d", "never"];

export function ShareDialog({ open, onClose }: ShareDialogProps) {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversation = useChatStore((state) =>
    state.conversations.find((item) => item.id === state.activeConversationId) ?? null
  );
  const addToast = useNotificationStore((state) => state.addToast);

  const [visibility, setVisibility] = useState<ShareVisibility>("unlisted");
  const [expiry, setExpiry] = useState<ShareExpiry>("24h");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleCreate = async () => {
    if (!conversation) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation,
          visibility,
          expiry,
          ...(visibility === "password" ? { password } : {}),
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setShareUrl(data.url);
      addToast({
        variant: "success",
        title: "Share link created",
        description: "The conversation can now be opened from the generated link.",
        duration: 4000,
      });
    } catch (error) {
      addToast({
        variant: "error",
        title: "Share creation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-surface-800 bg-surface-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Share Conversation</h2>
            <p className="text-sm text-surface-500">
              Generate a read-only link for the current conversation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200"
            aria-label="Close share dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-200">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setVisibility(option)}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    visibility === option
                      ? "border-brand-500 bg-brand-500/15 text-surface-100"
                      : "border-surface-700 bg-surface-900 text-surface-400 hover:text-surface-200"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-surface-200">Expiry</label>
            <select
              value={expiry}
              onChange={(event) => setExpiry(event.target.value as ShareExpiry)}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            >
              {EXPIRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {visibility === "password" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-surface-200">Password</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
                placeholder="Required for protected shares"
              />
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!activeConversationId || !conversation || isSubmitting || (visibility === "password" && !password)}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-surface-500"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Creating..." : "Create share link"}
          </button>

          {shareUrl && (
            <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4">
              <div className="mb-2 text-sm font-medium text-surface-100">Share URL</div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-md border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 outline-none"
                />
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    addToast({
                      variant: "success",
                      title: "Copied share link",
                      duration: 2500,
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-surface-700 px-3 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-800"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-surface-700 px-3 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-800"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Open
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
