"use client";

import { useMemo, useState } from "react";
import { PawPrint, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useChatStore } from "@/lib/store";
import { getModelOptions } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { ShareDialog } from "@/components/share/ShareDialog";
import { BuddyWidget } from "@/components/buddy/BuddyWidget";
import type { BuddyProfile } from "@/lib/buddy";

interface HeaderProps {
  buddyProfile: BuddyProfile;
  onOpenBuddy: () => void;
}

export function Header({ buddyProfile, onOpenBuddy }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, openSettings, getActiveConversation } = useChatStore();
  const [shareOpen, setShareOpen] = useState(false);
  const modelOptions = useMemo(() => getModelOptions(settings.provider), [settings.provider]);

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  } as const;

  const ThemeIcon = themeIcons[theme];
  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";

  return (
    <>
      <header className="flex items-center justify-between border-b border-surface-800 bg-surface-900/50 px-4 py-2.5 backdrop-blur-sm">
        <div className="min-w-0 flex items-center gap-3">
          <h1 className="text-sm font-medium text-surface-100">Chat</h1>
          <span className="truncate text-xs text-surface-500">
            {getActiveConversation()?.title ?? "No active conversation"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <BuddyWidget profile={buddyProfile} onOpen={onOpenBuddy} />
          <button
            type="button"
            onClick={onOpenBuddy}
            className="inline-flex rounded-md border border-surface-700 px-2.5 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100 md:hidden"
            aria-label="Open buddy panel"
          >
            <PawPrint className="h-4 w-4" aria-hidden="true" />
          </button>

          <span className="hidden rounded-md border border-surface-700 px-2 py-1 text-[11px] text-surface-400 md:inline-flex">
            {settings.localMode ? "Local mode" : settings.provider}
          </span>

          <label htmlFor="model-select" className="sr-only">
            Model
          </label>
          <select
            id="model-select"
            value={settings.model}
            onChange={(event) => updateSettings({ model: event.target.value })}
            className={cn(
              "rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs",
              "text-surface-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
            )}
          >
            {modelOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShareOpen(true)}
            className="rounded-md border border-surface-700 px-2.5 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
          >
            Share
          </button>
          <button
            onClick={openSettings}
            className="rounded-md border border-surface-700 px-2.5 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
          >
            Settings
          </button>

          <NotificationCenter />

          <button
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} theme`}
            className="rounded-md p-1.5 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ThemeIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}
