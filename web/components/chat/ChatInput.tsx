"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Send, Square, Paperclip, PawPrint } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { streamChat } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";
import type { BuddyProfile, BuddySuggestion } from "@/lib/buddy";
import { getBuddyTake } from "@/lib/buddy";
import { estimateWrappedLines } from "@/lib/pretextSpike";

interface ChatInputProps {
  conversationId: string;
  buddyProfile?: BuddyProfile;
  latestPrompt?: string;
  buddySuggestions?: BuddySuggestion[];
  onOpenBuddy?: () => void;
  pendingBuddyPrompt?: string;
  onBuddyPromptApplied?: () => void;
}

export function ChatInput({
  conversationId,
  buddyProfile,
  latestPrompt,
  buddySuggestions,
  onOpenBuddy,
  pendingBuddyPrompt,
  onBuddyPromptApplied,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { conversations, settings, addMessage, updateMessage } = useChatStore();
  const conversation = conversations.find((c) => c.id === conversationId);

  useEffect(() => {
    if (!pendingBuddyPrompt) {
      return;
    }
    setInput(pendingBuddyPrompt);
    onBuddyPromptApplied?.();
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      adjustHeight();
    });
  }, [pendingBuddyPrompt, onBuddyPromptApplied]);

  const helperSummary = useMemo(
    () => (buddyProfile ? getBuddyTake(buddyProfile, latestPrompt ?? "") : "Buddy helper is unavailable in this layout."),
    [buddyProfile, latestPrompt]
  );

  const estimatedRows = Math.min(6, estimateWrappedLines(input || helperSummary, 560));

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    addMessage(conversationId, {
      role: "user",
      content: text,
      status: "complete",
    });

    const assistantId = addMessage(conversationId, {
      role: "assistant",
      content: "",
      status: "streaming",
    });

    const controller = new AbortController();
    abortRef.current = controller;

    const messages = [
      ...(conversation?.messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: text },
    ];

    let fullText = "";

    try {
      for await (const chunk of streamChat(
        messages,
        settings.model,
        {
          provider: settings.provider,
          apiUrl: settings.apiUrl,
          apiKey: settings.apiKey,
          streamingEnabled: settings.streamingEnabled,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
        },
        controller.signal
      )) {
        if (chunk.type === "text" && chunk.content) {
          fullText += chunk.content;
          updateMessage(conversationId, assistantId, {
            content: fullText,
            status: "streaming",
          });
        } else if (chunk.type === "done") {
          break;
        } else if (chunk.type === "error") {
          updateMessage(conversationId, assistantId, {
            content: chunk.error ?? "An error occurred",
            status: "error",
          });
          return;
        }
      }

      updateMessage(conversationId, assistantId, { status: "complete" });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        updateMessage(conversationId, assistantId, {
          content: "Request failed. Please try again.",
          status: "error",
        });
      } else {
        updateMessage(conversationId, assistantId, { status: "complete" });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [
    input,
    isStreaming,
    conversationId,
    conversation,
    settings.model,
    settings.provider,
    settings.apiUrl,
    settings.apiKey,
    settings.streamingEnabled,
    settings.systemPrompt,
    settings.temperature,
    settings.maxTokens,
    addMessage,
    updateMessage,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="border-t border-surface-800 bg-surface-900/50 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-surface-500">Buddy helper</div>
              <p className="mt-1 text-sm text-surface-200">{helperSummary}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenBuddy?.()}
              className="inline-flex items-center gap-2 rounded-md border border-surface-700 px-2.5 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
              disabled={!onOpenBuddy}
            >
              <PawPrint className="h-4 w-4" aria-hidden="true" />
              Buddy panel
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(buddySuggestions ?? []).map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => {
                  setInput(suggestion.prompt);
                  requestAnimationFrame(() => {
                    textareaRef.current?.focus();
                    adjustHeight();
                  });
                }}
                className="rounded-full border border-surface-700 px-3 py-1 text-xs text-surface-300 transition-colors hover:border-brand-500 hover:bg-surface-800 hover:text-surface-100"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border bg-surface-800 px-3 py-2",
            "border-surface-700 transition-colors focus-within:border-brand-500"
          )}
        >
          <button
            className="mb-0.5 flex-shrink-0 p-1 text-surface-500 transition-colors hover:text-surface-300"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          </button>

          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message AG-Claw..."
            rows={Math.max(1, estimatedRows)}
            aria-label="Message"
            className={cn(
              "min-h-[24px] max-h-[200px] flex-1 resize-none bg-transparent py-0.5 text-sm text-surface-100",
              "placeholder:text-surface-500 focus:outline-none"
            )}
          />

          {isStreaming ? (
            <button
              onClick={handleStop}
              aria-label="Stop generation"
              className="flex-shrink-0 rounded-lg bg-surface-700 p-1.5 text-surface-300 transition-colors hover:bg-surface-600"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              aria-label="Send message"
              className={cn(
                "flex-shrink-0 rounded-lg p-1.5 transition-colors",
                input.trim()
                  ? "bg-brand-600 text-white hover:bg-brand-700"
                  : "cursor-not-allowed bg-surface-700 text-surface-500"
              )}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="mt-2 text-center text-xs text-surface-600">
          AG-Claw can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
