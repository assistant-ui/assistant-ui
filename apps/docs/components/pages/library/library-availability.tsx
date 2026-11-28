import type { LibraryAvailability } from "@/lib/library/facts";
import { cn } from "@/lib/utils";

const DOT: Record<LibraryAvailability, string> = {
  Live: "bg-emerald-500",
  Published: "bg-emerald-500",
  "In CLI": "bg-emerald-500",
  Supported: "bg-emerald-500",
  Hosted: "bg-sky-500",
  Docs: "bg-foreground/30",
  "Copy only": "bg-foreground/30",
  "GitHub only": "bg-amber-500",
  "In development": "bg-violet-500",
};

/** How an item reaches a project today, as a dot in its color and the word. */
export function LibraryAvailabilityMark({
  status,
  detail,
  className,
}: {
  status: LibraryAvailability;
  /** One sentence on what the status rests on, shown on hover. */
  detail?: string;
  className?: string;
}) {
  return (
    <span
      title={detail}
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-[13px] whitespace-nowrap",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", DOT[status])}
      />
      <span className="truncate">{status}</span>
    </span>
  );
}
