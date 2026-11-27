import {
  LIBRARY_KIND_LABEL,
  type LibraryKind,
} from "@/lib/library/saved-items";
import { cn } from "@/lib/utils";

// The darker step keeps small text readable on the light page.
const KIND_TONE: Record<LibraryKind, string> = {
  template: "text-emerald-700 dark:text-emerald-400",
  example: "text-amber-700 dark:text-amber-400",
  skill: "text-violet-600 dark:text-violet-400",
};

/** A library item's kind, in that kind's color with a dot before it. */
export function LibraryKindLabel({
  kind,
  className,
}: {
  kind: LibraryKind;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-xs",
        KIND_TONE[kind],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">{LIBRARY_KIND_LABEL[kind]}</span>
    </span>
  );
}
