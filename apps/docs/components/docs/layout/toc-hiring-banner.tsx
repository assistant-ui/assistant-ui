"use client";

import Link from "next/link";
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean";
import { X } from "lucide-react";

export const TOCHiringBanner = () => {
  const [dismissed, setDismissed] = usePersistentBoolean(
    "toc-hiring-banner-dismissed",
  );

  if (dismissed) return null;

  return (
    <div className="group relative">
      <Link
        href="/careers"
        className="border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50 block rounded-xl border px-3.5 py-3 transition-colors"
      >
        <p className="shimmer text-foreground/80 text-[11px] font-medium tracking-wide uppercase">
          We are hiring
        </p>
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
          Build the future of agentic UI with us →
        </p>
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={(e) => {
          e.preventDefault();
          setDismissed(true);
        }}
        className="border-border/60 bg-background text-muted-foreground hover:text-foreground absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border opacity-0 transition-all group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  );
};
