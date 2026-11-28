import {
  LIBRARY_KIND_LABEL,
  type LibraryKind,
} from "@/lib/library/saved-items";
import { cn } from "@/lib/utils";

// The darker step keeps small text readable on the light page.
const KIND_TONE: Record<LibraryKind, string> = {
  template: "text-emerald-700 dark:text-emerald-400",
  example: "text-amber-700 dark:text-amber-400",
  playground: "text-lime-700 dark:text-lime-400",
  preset: "text-pink-600 dark:text-pink-400",
  skill: "text-violet-600 dark:text-violet-400",
  component: "text-sky-700 dark:text-sky-400",
  block: "text-rose-600 dark:text-rose-400",
  runtime: "text-orange-700 dark:text-orange-400",
  integration: "text-indigo-600 dark:text-indigo-400",
  utility: "text-fuchsia-700 dark:text-fuchsia-400",
  agent: "text-cyan-700 dark:text-cyan-400",
  editor: "text-blue-600 dark:text-blue-400",
};

/** A library item's kind, in that kind's color with a dot before it. */
export function LibraryKindLabel({
  kind,
  label = LIBRARY_KIND_LABEL[kind],
  className,
}: {
  kind: LibraryKind;
  /** What to call it, when that is not the kind's own name. */
  label?: string;
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
      <span className="truncate">{label}</span>
    </span>
  );
}
