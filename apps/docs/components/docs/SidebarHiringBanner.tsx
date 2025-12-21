"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean";

export const SidebarHiringBanner = () => {
  const [dismissed, setDismissed] = usePersistentBoolean(
    "sidebar-hiring-banner-dismissed",
  );

  if (dismissed) return null;

  return (
    <div className="group relative">
      <Link
        href="/careers"
        className="group/link flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:border-primary/80"
      >
        <span className="flex flex-col text-left">
          <span className="font-semibold text-[11px] text-primary/80 uppercase tracking-[0.3em]">
            We&apos;re hiring
          </span>
          <span className="text-muted-foreground">
            Build the future of agentic UI.
          </span>
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover/link:translate-x-0.5 group-hover/link:text-primary" />
      </Link>
      <button
        type="button"
        aria-label="Dismiss hiring banner"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDismissed(true);
        }}
        className="absolute -top-[9px] -right-[9px] flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm transition hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background group-hover:opacity-100"
      >
        <span className="font-semibold text-[10px] leading-none">&times;</span>
      </button>
    </div>
  );
};
