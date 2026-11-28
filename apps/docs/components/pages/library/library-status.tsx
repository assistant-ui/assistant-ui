import {
  LIBRARY_STATUS_LABEL,
  LIBRARY_STATUS_MEANING,
  libraryStatus,
  type LibraryStatus,
} from "@/lib/library/status-data";
import { cn } from "@/lib/utils";

// The darker step keeps small text readable on the light page.
const STATUS_TONE: Record<LibraryStatus, string> = {
  live: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  experimental: "bg-amber-500/14 text-amber-700 dark:text-amber-400",
  unreleased: "bg-violet-500/12 text-violet-700 dark:text-violet-400",
  internal: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
  review: "bg-orange-500/14 text-orange-700 dark:text-orange-400",
  deprecated: "bg-red-500/12 text-red-700 dark:text-red-400",
};

/** Whether the item with this saved id should stay on show, as a colored badge. */
export function LibraryStatusBadge({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const { status, why } = libraryStatus(id);
  return (
    <span
      title={why ?? LIBRARY_STATUS_MEANING[status]}
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        STATUS_TONE[status],
        className,
      )}
    >
      {LIBRARY_STATUS_LABEL[status]}
    </span>
  );
}
