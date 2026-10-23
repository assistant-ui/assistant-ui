"use client";

import { useState, type ReactNode } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";
import { plateSurface } from "./figure";

const TABS = ["Preview", "Code"] as const;

export function ExampleFrame({
  preview,
  code,
  codeHtml,
  file,
}: {
  preview: ReactNode;
  code: string;
  codeHtml: string;
  file: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Preview");

  return (
    <div className="not-prose my-6">
      <div
        role="tablist"
        className="mb-2 flex items-center gap-0.5 text-[13px]"
      >
        {TABS.map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={tab === entry}
            onClick={() => setTab(entry)}
            className={cn(
              "text-muted-foreground h-7 rounded-sm px-2.5 transition-colors motion-reduce:transition-none",
              tab === entry
                ? "bg-foreground/[0.06] text-foreground"
                : "hover:text-foreground",
            )}
          >
            {entry}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        hidden={tab !== "Preview"}
        className={cn(
          plateSurface,
          "rounded-document px-4 py-8 sm:px-8 sm:py-10",
        )}
      >
        <div className="mx-auto w-full max-w-[640px]">{preview}</div>
      </div>
      {tab === "Code" && (
        <CodeBlock
          role="tabpanel"
          className="my-0"
          title={`${file}.tsx`}
          copyText={code}
          viewportClassName="max-h-[32rem] overflow-y-auto"
        >
          <div dangerouslySetInnerHTML={{ __html: codeHtml }} />
        </CodeBlock>
      )}
    </div>
  );
}
