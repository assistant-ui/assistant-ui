"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { LiveDot } from "@/components/shared/live-dot";

const INK_DEMO_URL =
  process.env.NEXT_PUBLIC_INK_DEMO_URL ?? "https://assistant-ui-ink.vercel.app";

export function TerminalDemo() {
  const src = useHydrated() ? INK_DEMO_URL : null;

  return (
    <div className="border-foreground/10 overflow-hidden border">
      <div className="border-foreground/10 text-muted-foreground flex h-9 items-center justify-between border-b px-3.5 font-mono text-[11px] tracking-wide">
        <span>~ assistant-ui · ink</span>
        <span className="flex items-center gap-1.5">
          <LiveDot />
          live
        </span>
      </div>
      {src ? (
        <iframe
          src={src}
          className="h-[480px] w-full border-0"
          title="assistant-ui ink live demo"
          allow="clipboard-read; clipboard-write"
        />
      ) : (
        <div
          className="bg-foreground/[0.025] dark:bg-foreground/[0.04] h-[480px] w-full"
          aria-hidden
        />
      )}
    </div>
  );
}
