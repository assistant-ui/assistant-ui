"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useScrolled } from "@/hooks/use-scrolled";
import { HeaderActions } from "./header-actions";
import { HeaderBrandLink } from "./header-brand-link";
import { headerBarClassName, headerSlashClassName } from "./header-chrome";

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
          <span className={headerSlashClassName}>/</span>
          <Link
            href="/oss"
            className="text-foreground hover:text-foreground/80 text-sm font-medium transition-colors"
          >
            oss
          </Link>
        </div>
        <HeaderActions
          githubHref="https://github.com/assistant-ui"
          githubLabel="assistant-ui on GitHub"
        />
      </div>
    </header>
  );
}
