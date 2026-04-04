"use client";

import { FlaskConical, Keyboard, Settings2, Sparkles } from "lucide-react";
import { useChatStore } from "@/lib/store";

export function QuickActions() {
  const { openResearch, openSettings, openSearch } = useChatStore();

  return (
    <div className="border-t border-surface-800 p-2">
      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={openSearch}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
        >
          <Sparkles className="h-4 w-4 text-brand-400" aria-hidden="true" />
          Search workspace
        </button>
        <button
          onClick={openSettings}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
        >
          <Settings2 className="h-4 w-4 text-surface-400" aria-hidden="true" />
          Open settings
        </button>
        <button
          onClick={openResearch}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
        >
          <FlaskConical className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Research tools
        </button>
        <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-surface-500">
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          `Ctrl+B` toggles the sidebar
        </div>
      </div>
    </div>
  );
}
