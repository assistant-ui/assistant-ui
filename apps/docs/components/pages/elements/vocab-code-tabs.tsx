"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "json", label: "IR JSON" },
  { key: "react", label: "React" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function VocabCodeTabs({
  jsonHtml,
  jsxHtml,
  jsonRaw,
  jsxRaw,
}: {
  jsonHtml: string;
  jsxHtml: string;
  jsonRaw: string;
  jsxRaw: string;
}) {
  const [tab, setTab] = useState<TabKey>("json");

  return (
    <CodeBlock
      className="my-0"
      viewportClassName="max-h-80 overflow-y-auto"
      copyText={tab === "json" ? jsonRaw : jsxRaw}
      title={
        <span className="flex items-center gap-0.5">
          {TABS.map((entry) => {
            const selected = entry.key === tab;
            return (
              <button
                key={entry.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setTab(entry.key)}
                className={cn(
                  "h-6 rounded-sm px-2 transition-colors motion-reduce:transition-none",
                  selected
                    ? "bg-foreground/[0.06] text-foreground"
                    : "hover:text-foreground",
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </span>
      }
    >
      <div
        dangerouslySetInnerHTML={{
          __html: tab === "json" ? jsonHtml : jsxHtml,
        }}
      />
    </CodeBlock>
  );
}
