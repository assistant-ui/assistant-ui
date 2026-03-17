"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type FooterItem = {
  name: ReactNode;
  url: string;
};

type DocsFooterProps = {
  previous?: FooterItem | undefined;
  next?: FooterItem | undefined;
};

export function DocsFooter({ previous, next }: DocsFooterProps) {
  if (!previous && !next) return null;

  return (
    <nav className="not-prose mt-16 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 sm:gap-3">
      {previous ? (
        <Link
          href={previous.url}
          className="group flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 transition-colors hover:bg-muted"
        >
          <ChevronLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
          <span className="truncate">{previous.name}</span>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={next.url}
          className="group flex items-center justify-end gap-2 rounded-lg bg-muted/50 px-4 py-3 text-right transition-colors hover:bg-muted"
        >
          <span className="truncate">{next.name}</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
