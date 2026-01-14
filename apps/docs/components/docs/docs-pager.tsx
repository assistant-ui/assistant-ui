"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PagerItem = {
  url: string;
};

type DocsPagerProps = {
  previous?: PagerItem | undefined;
  next?: PagerItem | undefined;
};

export function DocsPager({ previous, next }: DocsPagerProps) {
  if (!previous && !next) return null;

  return (
    <div className="flex items-center gap-1">
      {previous ? (
        <Link
          href={previous.url}
          className="flex size-9 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:size-8"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <div className="size-9 sm:size-8" />
      )}
      {next ? (
        <Link
          href={next.url}
          className="flex size-9 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:size-8"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <div className="size-9 sm:size-8" />
      )}
    </div>
  );
}
