"use client";

import { X } from "lucide-react";
import type { BuddyProfile, BuddySuggestion } from "@/lib/buddy";
import { getBuddyStatSummary, getBuddyTake, rarityClassName } from "@/lib/buddy";
import { cn } from "@/lib/utils";

interface BuddyPanelProps {
  open: boolean;
  profile: BuddyProfile;
  latestPrompt: string;
  suggestions: BuddySuggestion[];
  onClose: () => void;
  onUseSuggestion: (prompt: string) => void;
}

export function BuddyPanel({
  open,
  profile,
  latestPrompt,
  suggestions,
  onClose,
  onUseSuggestion,
}: BuddyPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-surface-800 bg-surface-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-surface-500">Buddy panel</div>
            <div className="text-sm font-medium text-surface-100">Visible advisory companion</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
            aria-label="Close buddy panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <section className="rounded-xl border border-surface-800 bg-surface-900/70 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-800 text-sm font-semibold uppercase text-surface-100">
                {profile.species.slice(0, 2)}
              </div>
              <div>
                <div className={cn("text-xs font-semibold uppercase tracking-wide", rarityClassName(profile.rarity))}>
                  {profile.rarity}
                </div>
                <div className="text-lg font-semibold text-surface-100">{profile.species}</div>
                <div className="text-sm text-surface-400">hat {profile.hat} / eyes {profile.eye}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(profile.stats).map(([name, value]) => (
                <div key={name} className="rounded-md border border-surface-800 bg-surface-950/70 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-surface-500">{name}</div>
                  <div className="font-medium text-surface-100">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-surface-800 bg-surface-900/70 p-4">
            <div className="text-xs uppercase tracking-wide text-surface-500">Buddy take</div>
            <p className="mt-2 text-sm text-surface-200">{getBuddyTake(profile, latestPrompt)}</p>
            <div className="mt-3 text-xs text-surface-500">Top stat: {getBuddyStatSummary(profile)}</div>
          </section>

          <section className="rounded-xl border border-surface-800 bg-surface-900/70 p-4">
            <div className="text-xs uppercase tracking-wide text-surface-500">Prompt suggestions</div>
            <div className="mt-3 space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => onUseSuggestion(suggestion.prompt)}
                  className="w-full rounded-md border border-surface-700 bg-surface-950 px-3 py-2 text-left text-sm text-surface-200 transition-colors hover:border-brand-500 hover:bg-surface-900"
                >
                  <div className="font-medium text-surface-100">{suggestion.label}</div>
                  <div className="mt-1 text-xs text-surface-400">{suggestion.prompt}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-surface-800 bg-surface-900/70 p-4">
            <div className="text-xs uppercase tracking-wide text-surface-500">Conversation context</div>
            <p className="mt-2 text-sm text-surface-200">{latestPrompt.trim() || "No active prompt yet. Buddy will react after the first message."}</p>
            <p className="mt-3 text-xs text-surface-500">Advisory only. No hidden execution or conversation mutation.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
