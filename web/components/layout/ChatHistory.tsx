"use client";

import { MessageSquarePlus, Pin } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

export function ChatHistory() {
  const {
    conversations,
    activeConversationId,
    pinnedIds,
    searchQuery,
    createConversation,
    setActiveConversation,
    pinConversation,
    setSearchQuery,
  } = useChatStore();

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filtered = conversations.filter((conversation) => {
    if (!normalizedQuery) return true;
    return conversation.title.toLowerCase().includes(normalizedQuery);
  });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-surface-800 p-3">
        <button
          onClick={createConversation}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          New conversation
        </button>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations"
          className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none transition-colors placeholder:text-surface-500 focus:border-brand-500"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-700 p-4 text-sm text-surface-500">
            No conversations match the current filter.
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((conversation) => {
              const isPinned = pinnedIds.includes(conversation.id);
              const isActive = conversation.id === activeConversationId;
              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-start gap-2 rounded-md border px-3 py-2 transition-colors",
                    isActive
                      ? "border-brand-500/50 bg-surface-800"
                      : "border-transparent hover:border-surface-800 hover:bg-surface-900/60"
                  )}
                >
                  <button
                    onClick={() => setActiveConversation(conversation.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-sm font-medium text-surface-100">
                      {conversation.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-surface-500">
                      <span>{conversation.messages.length} messages</span>
                      <span>{formatDate(conversation.updatedAt)}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => pinConversation(conversation.id)}
                    aria-label={isPinned ? "Unpin conversation" : "Pin conversation"}
                    className={cn(
                      "rounded p-1 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200",
                      isPinned && "text-amber-300"
                    )}
                  >
                    <Pin className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
