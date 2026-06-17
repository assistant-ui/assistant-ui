import type { ReactNode } from "react";

/**
 * A key/value row: label left, value right on one baseline. Flat (no box). Group
 * a sequence in `SummaryList` for hairline dividers.
 */
export const SummaryItem = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="flex min-h-7 items-baseline justify-between gap-2 py-1 text-[11px]">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="text-foreground min-w-0 truncate text-right font-medium tabular-nums">
      {value}
    </span>
  </div>
);

/** Divided list of `SummaryItem` rows. Unboxed: dividers do the grouping. */
export const SummaryList = ({ children }: { children: ReactNode }) => (
  <div className="divide-border divide-y">{children}</div>
);
