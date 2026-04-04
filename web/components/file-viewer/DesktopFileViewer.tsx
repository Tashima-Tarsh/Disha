"use client";

import { useMemo, useState } from "react";
import { X, Save } from "lucide-react";
import { useFileViewerStore } from "@/lib/fileViewerStore";
import { cn } from "@/lib/utils";
import { FileBreadcrumb } from "./FileBreadcrumb";
import { FileInfoBar } from "./FileInfoBar";
import { ImageViewer } from "./ImageViewer";

export function DesktopFileViewer() {
  const {
    isOpen,
    tabs,
    activeTabId,
    closeTab,
    updateContent,
    markSaved,
  } = useFileViewerStore();
  const [isSaving, setIsSaving] = useState(false);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

  if (!isOpen || !activeTab) {
    return null;
  }

  const handleSave = async () => {
    if (activeTab.isImage || activeTab.mode === "diff") return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/files/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activeTab.path, content: activeTab.content }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      markSaved(activeTab.id);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside className="hidden xl:flex w-[44rem] min-w-[32rem] max-w-[55vw] border-l border-surface-800 bg-surface-950">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-surface-800 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-surface-100">{activeTab.filename}</div>
            <div className="text-xs text-surface-500">Workspace file viewer</div>
          </div>
          <div className="flex items-center gap-2">
            {!activeTab.isImage && activeTab.mode !== "diff" && (
              <button
                onClick={handleSave}
                disabled={!activeTab.isDirty || isSaving}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
                  activeTab.isDirty
                    ? "bg-brand-600 text-white hover:bg-brand-500"
                    : "bg-surface-800 text-surface-500"
                )}
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {isSaving ? "Saving..." : "Save"}
              </button>
            )}
            <button
              onClick={() => closeTab(activeTab.id)}
              className="rounded-md p-1.5 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200"
              aria-label="Close file viewer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <FileBreadcrumb path={activeTab.path} />

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab.isImage ? (
            <ImageViewer src={activeTab.content} path={activeTab.path} />
          ) : activeTab.mode === "diff" && activeTab.diff ? (
            <div className="grid h-full min-h-0 grid-cols-2 divide-x divide-surface-800">
              <pre className="overflow-auto p-4 text-xs text-surface-400">{activeTab.diff.oldContent}</pre>
              <pre className="overflow-auto p-4 text-xs text-surface-100">{activeTab.diff.newContent}</pre>
            </div>
          ) : activeTab.mode === "edit" ? (
            <textarea
              value={activeTab.content}
              onChange={(event) => updateContent(activeTab.id, event.target.value)}
              className="h-full w-full resize-none bg-surface-950 p-4 font-mono text-xs text-surface-100 outline-none"
            />
          ) : (
            <pre className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-surface-100">
              {activeTab.content}
            </pre>
          )}
        </div>

        <FileInfoBar tab={activeTab} />
      </div>
    </aside>
  );
}
