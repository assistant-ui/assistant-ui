"use client";

import { lazy, Suspense, useState, type ReactNode } from "react";
import { FallbackBoundary } from "@/lib/fallback-boundary";
import { cn } from "@/lib/utils";
import { plateSurface } from "./figure";

const TABS = ["Preview", "Code"] as const;

const loadCode = () => import("./example-code");
const ExampleCode = lazy(() =>
  loadCode().then((mod) => ({ default: mod.ExampleCode })),
);

// Pointing at the Code tab starts loading its chunk and source.
const preload = (file: string) => {
  loadCode().then(
    (mod) => mod.loadExampleSource(file).catch(() => {}),
    () => {},
  );
};

function CodeStatus({ children }: { children: ReactNode }) {
  return (
    <p
      role="tabpanel"
      aria-live="polite"
      className="text-muted-foreground border-border/60 rounded-lg border px-4 py-3 font-mono text-[13px]"
    >
      {children}
    </p>
  );
}

// The Code tab's source and highlighted HTML load when the reader opens it
// (see app/api/diagrammatic/examples), instead of riding along in the page:
// a page of examples carried each sample twice, up to 32 KB per example.
export function ExampleFrame({
  preview,
  file,
}: {
  preview: ReactNode;
  file: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Preview");
  // Counts opens of the Code tab, so an open after a failed load retries.
  const [codeOpens, setCodeOpens] = useState(0);

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
            onClick={() => {
              if (entry === "Code" && tab !== "Code") {
                setCodeOpens((n) => n + 1);
              }
              setTab(entry);
            }}
            {...(entry === "Code" && {
              onPointerEnter: () => preload(file),
              onFocus: () => preload(file),
            })}
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
        <FallbackBoundary
          fallback={
            <CodeStatus>
              Couldn&apos;t load the source. Open the Code tab again to retry.
            </CodeStatus>
          }
        >
          <Suspense fallback={<CodeStatus>Loading source…</CodeStatus>}>
            <ExampleCode file={file} attempt={codeOpens} />
          </Suspense>
        </FallbackBoundary>
      )}
    </div>
  );
}
