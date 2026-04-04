"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderTree, HardDrive, RefreshCw } from "lucide-react";
import { useFileViewerStore } from "@/lib/fileViewerStore";

type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

function TreeNode({
  node,
  expanded,
  onToggle,
  onOpen,
}: {
  node: FileNode;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onOpen: (path: string) => void;
}) {
  const isDirectory = node.type === "directory";
  const isExpanded = expanded.has(node.path);

  return (
    <div>
      <button
        onClick={() => (isDirectory ? onToggle(node.path) : onOpen(node.path))}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
      >
        {isDirectory ? (
          isExpanded ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />
        ) : (
          <span className="inline-block h-4 w-4" />
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isDirectory && isExpanded && node.children && node.children.length > 0 && (
        <div className="ml-4 border-l border-surface-800 pl-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer() {
  const loadAndOpen = useFileViewerStore((state) => state.loadAndOpen);
  const [entries, setEntries] = useState<FileNode[]>([]);
  const [absoluteRoot, setAbsoluteRoot] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["src", "web"]));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/files/list");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setEntries(data.entries ?? []);
      setAbsoluteRoot(data.absoluteRoot ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const toggleNode = (path: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const visibleCount = useMemo(() => entries.length, [entries]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-surface-800 p-3">
        <div className="flex items-center justify-between gap-2 text-sm font-medium text-surface-100">
          <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-brand-400" aria-hidden="true" />
          Workspace
          </div>
          <button
            onClick={() => void refresh()}
            className="rounded-md p-1 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200"
            aria-label="Refresh file explorer"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1 text-xs text-surface-500">
          Browsing {visibleCount} top-level items from the configured workspace root.
        </p>
      </div>

      <div className="space-y-3 p-3 text-sm">
        <div className="rounded-md border border-surface-800 bg-surface-900/60 p-3">
          <div className="flex items-center gap-2 text-surface-200">
            <HardDrive className="h-4 w-4 text-surface-400" aria-hidden="true" />
            Workspace root
          </div>
          <div className="mt-2 truncate font-mono text-xs text-surface-500">{absoluteRoot || "Loading..."}</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-surface-800 bg-surface-900/60 p-2">
          {isLoading ? (
            <div className="p-3 text-sm text-surface-500">Loading files…</div>
          ) : error ? (
            <div className="p-3 text-sm text-red-400">{error}</div>
          ) : (
            entries.map((entry) => (
              <TreeNode
                key={entry.path}
                node={entry}
                expanded={expanded}
                onToggle={toggleNode}
                onOpen={(path) => void loadAndOpen(path)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
