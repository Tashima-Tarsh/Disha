"use client";

export function FileExplorer() {
  return (
    <div className="flex flex-col gap-1 p-2">
      <h3 className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Files
      </h3>
      <p className="px-2 text-xs text-muted-foreground">No files open</p>
    </div>
  );
}
