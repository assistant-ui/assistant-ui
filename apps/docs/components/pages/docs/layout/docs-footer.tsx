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
    <nav className="not-prose mt-16 flex items-center justify-between gap-4 text-sm">
      {previous ? (
        <Link
          href={previous.url}
          className="group text-muted-foreground hover:text-foreground inline-flex min-w-0 items-center gap-1.5 transition-colors"
        >
          <ChevronLeft className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
          <span className="min-w-0 truncate">
            {previous.section ? (
              <span className="opacity-60">{previous.section} / </span>
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
          className="group text-muted-foreground hover:text-foreground inline-flex min-w-0 items-center gap-1.5 transition-colors"
        >
          <span className="min-w-0 truncate">
            {next.section ? (
              <span className="opacity-60">{next.section} / </span>
            ) : null}
            {next.name}
          </span>
          <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
