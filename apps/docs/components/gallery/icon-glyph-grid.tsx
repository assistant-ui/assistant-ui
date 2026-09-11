"use client";

import {
  ICON_NAMES,
  renderGenerativeUI,
} from "@assistant-ui/react-generative-ui";
import { styledGenerativeUILibrary } from "@/components/assistant-ui/elements/generative-ui";

export function IconGlyphGrid() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
      {ICON_NAMES.map((name) => (
        <div
          key={name}
          className="bg-foreground/[0.03] dark:bg-foreground/[0.05] flex flex-col items-center gap-2 rounded-xl px-2 py-3"
        >
          {renderGenerativeUI(
            { $type: "Icon", name, size: "md" },
            styledGenerativeUILibrary,
            { status: "done" },
          )}
          <span className="text-foreground/45 font-mono text-[11px] tracking-tight">
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
