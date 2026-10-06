"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type FooterItem = {
  name: ReactNode;
  url: string;
  section?: ReactNode;
};

type DocsFooterProps = {
  previous?: FooterItem | undefined;
  next?: FooterItem | undefined;
};

export function DocsFooter({ previous, next }: DocsFooterProps) {
  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Documentation pages"
      className="not-prose border-foreground/10 mt-16 grid grid-cols-2 gap-6 border-t pt-6 text-sm"
    >
      {previous ? (
        <Link
          href={previous.url}
          rel="prev"
          className="group hover:text-foreground focus-visible:outline-ring flex min-h-11 min-w-0 flex-col items-start gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span className="text-muted-foreground flex items-center gap-1.5">
            <ChevronLeft className="size-3.5" />
            Previous
          </span>
          <span className="text-foreground leading-relaxed">
            {previous.section ? (
              <span className="text-muted-foreground mb-1 block text-xs">
                {previous.section}
              </span>
            ) : null}
            {previous.name}
          </span>
        </Link>
      ) : (
        <span />
      )}

      {next ? (
        <Link
          href={next.url}
          rel="next"
          className="group hover:text-foreground focus-visible:outline-ring flex min-h-11 min-w-0 flex-col items-end gap-2 text-right transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span className="text-muted-foreground flex items-center gap-1.5">
            Next
            <ChevronRight className="size-3.5" />
          </span>
          <span className="text-foreground leading-relaxed">
            {next.section ? (
              <span className="text-muted-foreground mb-1 block text-xs">
                {next.section}
              </span>
            ) : null}
            {next.name}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
