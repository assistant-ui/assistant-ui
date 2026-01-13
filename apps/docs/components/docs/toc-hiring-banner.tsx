"use client";

import Link from "next/link";
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean";

export const TOCHiringBanner = () => {
  const [dismissed, setDismissed] = usePersistentBoolean(
    "toc-hiring-banner-dismissed",
  );

  if (dismissed) return null;

  return (
    <div className="group relative">
      <Link
        href="/careers"
        className="block rounded-md border border-border/60 border-dashed px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/30"
      >
        <p className="shimmer font-medium text-foreground/70 text-xs uppercase">
          WE ARE HIRING
        </p>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Build the future of agentic UI.
        </p>
        <p className="text-muted-foreground text-xs">With us →</p>
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={(e) => {
          e.preventDefault();
          setDismissed(true);
        }}
        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-0 transition-opacity hover:bg-muted-foreground/20 hover:text-foreground group-hover:opacity-100"
      >
        <span className="text-[10px] leading-none">×</span>
      </button>
    </div>
  );
};
