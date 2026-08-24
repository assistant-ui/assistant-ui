"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/shared/copy-button";

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
    <div>
      <div className="flex items-center gap-1">
        {TABS.map((entry) => {
          const selected = entry.key === tab;
          return (
            <button
              key={entry.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setTab(entry.key)}
              className={cn(
                "h-7 rounded-full px-3 text-[12.5px] transition-[color,background-color] duration-150 motion-reduce:transition-none",
                selected
                  ? "bg-foreground/[0.05] text-foreground dark:bg-foreground/[0.08] font-medium"
                  : "text-foreground/45 hover:text-foreground/90",
              )}
            >
              {entry.label}
            </button>
          );
        })}
        <CopyButton
          text={tab === "json" ? jsonRaw : jsxRaw}
          className="ms-auto"
        />
      </div>
      <div
        className="bg-foreground/[0.025] dark:bg-foreground/[0.04] mt-3 overflow-hidden rounded-2xl [&_.line]:px-0! [&_pre]:max-h-80 [&_pre]:overflow-auto [&_pre]:bg-transparent! [&_pre]:p-5 [&_pre]:font-mono [&_pre]:text-[12.5px] [&_pre]:leading-[1.7]"
        dangerouslySetInnerHTML={{
          __html: tab === "json" ? jsonHtml : jsxHtml,
        }}
      />
    </div>
  );
}
