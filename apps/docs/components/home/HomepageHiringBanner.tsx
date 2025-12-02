"use client";

import { usePersistentBoolean } from "@/hooks/use-persistent-boolean";
import { ArrowRightIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function HomepageHiringBanner() {
  const pathname = usePathname();

  const [dismissed, setDismissed] = usePersistentBoolean(
    "homepage-hiring-banner-dismissed",
  );

  if (pathname !== "/" || dismissed) return null;

  return (
    <div className="relative border-border/70 border-b py-2 text-sm backdrop-blur-lg">
      <div className="relative mx-auto flex w-full max-w-fd-container items-center justify-center px-4">
        <Link
          href="/careers"
          className="group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <span className="shimmer text-muted-foreground transition-colors group-hover:text-foreground">
            We're hiring. Build the future of agentic UI.
          </span>
          <ArrowRightIcon className="size-3.5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
        <button
          type="button"
          aria-label="Dismiss hiring banner"
          onClick={() => setDismissed(true)}
          className="absolute right-4 text-muted-foreground transition-colors hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
