"use client";

import {
  ICON_NAMES,
  renderGenerativeUI,
} from "@assistant-ui/react-generative-ui";
import { styledGenerativeUILibrary } from "@/components/assistant-ui/generative-ui";

export function IconGlyphGrid() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
      {ICON_NAMES.map((name) => (
        <div
          key={name}
          className="border-border/60 flex flex-col items-center gap-2 rounded-lg border px-2 py-3"
        >
          {renderGenerativeUI(
            { $type: "Icon", name, size: "md" },
            styledGenerativeUILibrary,
            { status: "done" },
          )}
          <span className="text-muted-foreground font-mono text-[11px]">
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
