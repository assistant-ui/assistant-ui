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
    <nav className="mt-12 flex items-center justify-between gap-4 border-t pt-6 text-sm">
      {previous ? (
        <Link
          href={previous.url}
          className="group flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span>{previous.name}</span>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={next.url}
          className="group flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>{next.name}</span>
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
