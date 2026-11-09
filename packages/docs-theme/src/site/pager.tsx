import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const pagerLabel = (direction: "Previous" | "Next", name: ReactNode) =>
  typeof name === "string" && name !== ""
    ? `${direction}: ${name}`
    : `${direction} page`;

export function DocsPagerNavigation({
  previous,
  next,
  children,
}: {
  previous?: { url: string; name?: ReactNode } | undefined;
  next?: { url: string; name?: ReactNode } | undefined;
  children?: ReactNode;
}) {
  const buttonClass =
    "flex size-7 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:size-8";
  const disabledClass =
    "flex size-7 items-center justify-center rounded-md bg-muted/30 text-muted-foreground/40 cursor-not-allowed sm:size-8";
  return (
    <div className="flex items-center gap-1">
      {previous ? (
        <Link
          href={previous.url}
          className={buttonClass}
          aria-label={pagerLabel("Previous", previous.name)}
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <div className={disabledClass}>
          <ChevronLeft className="size-4" />
        </div>
      )}
      {next ? (
        <Link
          href={next.url}
          className={buttonClass}
          aria-label={pagerLabel("Next", next.name)}
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <div className={disabledClass}>
          <ChevronRight className="size-4" />
        </div>
      )}
      {children}
    </div>
  );
}
