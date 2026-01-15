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
        className="block rounded-xl bg-muted px-3.5 py-3 transition-colors hover:bg-accent"
      >
        <p className="shimmer font-medium text-[11px] text-foreground/80 uppercase tracking-wide">
          We are hiring
        </p>
        <p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">
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
        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-background text-muted-foreground opacity-0 shadow-sm transition-all hover:text-foreground group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  );
};
