"use client";

import { Sparkles } from "lucide-react";
import type { BuddyProfile } from "@/lib/buddy";
import { getBuddyStatSummary, rarityClassName } from "@/lib/buddy";
import { cn } from "@/lib/utils";

interface BuddyWidgetProps {
  profile: BuddyProfile;
  onOpen: () => void;
}

export function BuddyWidget({ profile, onOpen }: BuddyWidgetProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "hidden min-w-[13rem] items-center gap-3 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-left transition-colors md:flex",
        "hover:border-brand-500 hover:bg-surface-800"
      )}
      aria-label="Open buddy panel"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-800 text-xs font-semibold uppercase text-surface-200">
        {profile.species.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs">
          <span className={cn("font-semibold uppercase tracking-wide", rarityClassName(profile.rarity))}>
            {profile.rarity}
          </span>
          {profile.shiny && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              shiny
            </span>
          )}
        </div>
        <div className="truncate text-sm font-medium text-surface-100">
          {profile.species} / {profile.hat} / {profile.eye}
        </div>
        <div className="truncate text-xs text-surface-400">{getBuddyStatSummary(profile)}</div>
      </div>
    </button>
  );
}
