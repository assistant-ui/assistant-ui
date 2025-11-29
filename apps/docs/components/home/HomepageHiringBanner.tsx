"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean";

export const HomepageHiringBanner = () => {
  const pathname = usePathname();

  const [dismissed, setDismissed] = usePersistentBoolean(
    "homepage-hiring-banner-dismissed",
  );

  if (pathname !== "/" || dismissed) return null;

  return (
    <div className="group relative border-border/70 border-b py-2 text-sm backdrop-blur-lg transition-colors">
      <div className="relative mx-auto flex w-full max-w-fd-container items-center justify-center gap-3 px-4">
        <Link
          href="/careers"
          className="group inline-flex items-center gap-2 whitespace-nowrap font-medium text-foreground transition-colors hover:text-primary"
        >
          <span className="shimmer font-medium text-foreground/40 text-sm group-hover:text-primary">
            {"We're hiring. Build the future of agentic UI."}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
        <button
          type="button"
          aria-label="Dismiss hiring banner"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDismissed(true);
          }}
          className="absolute right-4 font-semibold text-base text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          &times;
        </button>
      </div>
    </div>
  );
};
