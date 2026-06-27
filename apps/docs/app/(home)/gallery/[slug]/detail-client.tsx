"use client";

import { useState, type ReactNode } from "react";
import {
  renderGenerativeUI,
  generativeUIToJSX,
} from "@assistant-ui/react-generative-ui";
import { styledGenerativeUILibrary } from "@/components/gallery/styled";
import { GenerativeUIEditor } from "@/components/gallery/editor";
import { cn } from "@/lib/utils";

export function WidgetDetailClient({ spec }: { spec: unknown }) {
  const [tab, setTab] = useState<"preview" | "code" | "editor">("preview");

  const preview: ReactNode = renderGenerativeUI(
    spec,
    styledGenerativeUILibrary,
    { status: "done" },
  );

  const jsxCode = generativeUIToJSX(spec);

  return (
    <>
      <div className="border-border/60 mb-4 flex gap-1 border-b">
        {(["preview", "code", "editor"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "pr-4 pb-2 transition-colors",
              tab === t
                ? "text-foreground border-foreground border-b-2"
                : "text-muted-foreground",
            )}
          >
            {t === "preview" ? "Preview" : t === "code" ? "Code" : "Editor"}
          </button>
        ))}
      </div>

      {tab === "preview" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="bg-muted/20 flex items-center justify-center rounded-lg border p-8">
            <div className="w-full max-w-sm">{preview}</div>
          </div>
          <div className="relative">
            <pre className="bg-muted/30 h-full overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
              <code>{jsxCode}</code>
            </pre>
          </div>
        </div>
      ) : tab === "code" ? (
        <pre className="bg-muted/30 overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
          <code>{jsxCode}</code>
        </pre>
      ) : (
        <GenerativeUIEditor
          initialSpec={spec}
          library={styledGenerativeUILibrary}
        />
      )}
    </>
  );
}
