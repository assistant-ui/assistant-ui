"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { GitHubIcon } from "@/components/icons/github";
import { useScrolled } from "@/hooks/use-scrolled";
import { CartButton } from "./shop-entry";
import { HeaderBrandLink } from "./header-brand-link";
import { headerBarClassName } from "./header-chrome";
import { ThemeToggle } from "./theme-toggle";

/** The open-source index uses the same chrome as the projects it lists. */
export function OssHeader(): React.ReactElement {
  const scrolled = useScrolled();
  return (
    <header className="sticky top-0 z-50 w-full shrink-0">
      <div
        className={cn(
          "relative flex h-12 w-full items-center justify-between px-4",
          headerBarClassName(scrolled, "mx-auto max-w-7xl"),
        )}
      >
        <div className="flex min-w-0 items-center">
          <HeaderBrandLink showLabel={false} />
          <span className="text-muted-foreground/40 ml-2 sm:ml-3">/</span>
          <Link
            href="/oss"
            className="text-foreground hover:text-foreground/80 ml-2 text-sm font-medium transition-colors"
          >
            oss
          </Link>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <CartButton />
          <a
            href="https://github.com/assistant-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
            aria-label="assistant-ui on GitHub"
          >
            <GitHubIcon className="size-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
