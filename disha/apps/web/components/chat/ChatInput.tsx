"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Square, Paperclip, Sparkles } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { streamChat } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInputProps {
  conversationId: string;
}

export function ChatInput({ conversationId }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { conversations, settings, addMessage, updateMessage } = useChatStore();
  const conversation = conversations.find((c) => c.id === conversationId);

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
      for await (const chunk of streamChat(messages, settings.model, controller.signal)) {
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
          content: "Protocol initialization failed. Please reconnect.",
          status: "error",
        });
      } else {
        updateMessage(conversationId, assistantId, { status: "complete" });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, conversationId, conversation, settings.model, addMessage, updateMessage]);

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
    <div className="px-8 pb-8 pt-0 z-10 relative">
      <div className="max-w-4xl mx-auto">
        <div
          className={cn(
            "flex items-end gap-3 rounded-2xl border bg-white/5 p-4",
            "border-white/5 focus-within:border-white/10 transition-all duration-500 relative overflow-hidden glass-elite shadow-glass-soft"
          )}
        >
          <button
            className="p-2 text-pearl/20 hover:text-pearl/60 transition-colors flex-shrink-0 mb-0.5 relative z-10"
            aria-label="Add asset"
          >
            <Paperclip size={20} />
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
            placeholder="Search intelligence or execute commands..."
            rows={1}
            aria-label="Message"
            className={cn(
              "flex-1 resize-none bg-transparent text-sm text-pearl font-sans leading-relaxed",
              "placeholder:text-pearl/20 focus:outline-none relative z-10",
              "min-h-[24px] max-h-[200px] py-1"
            )}
          />

          <AnimatePresence mode="wait">
            {isStreaming ? (
              <motion.button
                key="stop"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleStop}
                aria-label="Stop intelligence"
                className="p-3 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all relative z-10 flex-shrink-0"
              >
                <Square size={20} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleSubmit}
                disabled={!input.trim()}
                aria-label="Send intelligence"
                className={cn(
                  "p-3 rounded-xl transition-all duration-500 relative z-10 flex-shrink-0",
                  input.trim()
                    ? "bg-white text-midnight hover:scale-105 shadow-glass-soft"
                    : "bg-white/5 text-pearl/10 cursor-not-allowed"
                )}
              >
                <Send size={20} fill={input.trim() ? "currentColor" : "none"} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-center items-center mt-6 space-x-4">
           <span className="text-[10px] uppercase font-display tracking-[0.4em] text-pearl/20">
             Cognitive Uplink Verified
           </span>
           <div className="w-1 h-1 rounded-full bg-aurora/40" />
           <span className="text-[10px] uppercase font-display tracking-[0.4em] text-pearl/20">
             Privacy Tier 1 Encrypted
           </span>
        </div>
      </div>
    </div>
  );
}

