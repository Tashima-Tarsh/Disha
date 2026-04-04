"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { SettingsNav, type SettingsSection } from "./SettingsNav";
import { GeneralSettings } from "./GeneralSettings";
import { ModelSettings } from "./ModelSettings";
import { ApiSettings } from "./ApiSettings";
import { PermissionSettings } from "./PermissionSettings";
import { McpSettings } from "./McpSettings";
import { KeyboardSettings } from "./KeyboardSettings";
import { DataSettings } from "./DataSettings";

function renderSection(section: SettingsSection) {
  switch (section) {
    case "general":
      return <GeneralSettings />;
    case "model":
      return <ModelSettings />;
    case "api":
      return <ApiSettings />;
    case "permissions":
      return <PermissionSettings />;
    case "mcp":
      return <McpSettings />;
    case "keyboard":
      return <KeyboardSettings />;
    case "data":
      return <DataSettings />;
  }
}

export function SettingsDialog() {
  const { settingsOpen, closeSettings } = useChatStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [searchQuery, setSearchQuery] = useState("");

  const content = useMemo(() => renderSection(activeSection), [activeSection]);

  if (!settingsOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[min(44rem,90vh)] w-[min(72rem,100%)] overflow-hidden rounded-2xl border border-surface-800 bg-surface-950 shadow-2xl">
        <div className="flex w-64 flex-col border-r border-surface-800 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-surface-100">Settings</h2>
              <p className="text-xs text-surface-500">Adjust the local web workspace.</p>
            </div>
            <button
              onClick={closeSettings}
              className="rounded-md p-2 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search settings"
            className="mb-3 rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
          />
          <SettingsNav active={activeSection} onChange={setActiveSection} searchQuery={searchQuery} />
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          {content}
        </div>
      </div>
    </div>
  );
}
