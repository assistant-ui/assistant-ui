"use client";

import { A2uiSurfaceRenderer, useA2uiSurfaces } from "@assistant-ui/react-a2ui";

export function Sidebar() {
  const surfaces = useA2uiSurfaces();
  if (surfaces.length === 0) return null;
  return (
    <aside className="w-96 shrink-0 overflow-y-auto border-border/60 border-l bg-muted/10 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Agent UI
        </span>
      </div>
      <A2uiSurfaceRenderer className="space-y-4" />
    </aside>
  );
}
