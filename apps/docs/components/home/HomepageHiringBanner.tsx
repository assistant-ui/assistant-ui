"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean";
import { TextShimmer } from "@/components/ui/TextShimmer";

export const HomepageHiringBanner = () => {
  const pathname = usePathname();
  const [dismissed, setDismissed] = usePersistentBoolean(
    "homepage-hiring-banner-dismissed",
  );

  if (pathname !== "/" || dismissed) return null;

  return (
    <div className="group relative border-b border-border/70 py-2 text-sm backdrop-blur-lg transition-colors">
      <div className="relative mx-auto flex w-full max-w-fd-container items-center justify-center gap-3 px-4">
        <Link
          href="/careers"
          className="group inline-flex items-center gap-2 font-medium whitespace-nowrap text-foreground transition-colors hover:text-primary"
        >
          <TextShimmer
            as="span"
            className="text-sm font-medium transition-colors group-hover:[--base-color:theme(colors.primary.DEFAULT)]"
            duration={4}
          >
            {"We're hiring. Build the future of agentic UI."}
          </TextShimmer>
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
          className="absolute right-4 text-base font-semibold text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
};
