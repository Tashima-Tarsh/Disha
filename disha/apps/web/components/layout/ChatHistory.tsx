"use client";

import { cn } from "@/lib/utils";

export function ChatHistory() {
  return (
    <div className="flex flex-col gap-1 p-2">
      <h3 className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        History
      </h3>
      <p className="px-2 text-xs text-muted-foreground">No conversations yet</p>
    </div>
  );
}
