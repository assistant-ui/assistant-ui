import clsx from "clsx";
import type { ReactNode } from "react";

/** Shared nav rail + detail track sizing for the master/detail tabs. */
export const NAV_COL = "clamp(14rem,28%,18rem)_minmax(0,1fr)";

export interface SplitColumn {
  key: string;
  /** Fixed rail header; stays aligned across columns. */
  header?: ReactNode | undefined;
  /** Scrollable pane body. */
  children: ReactNode;
}

/**
 * Multi-column split surface. Each column keeps its header fixed and only the
 * body scrolls, so rail titles and divider lines stay aligned across columns.
 */
export const SplitLayout = ({
  sizes,
  columns,
  className,
}: {
  /** Underscore-separated CSS grid track list, e.g. `12rem_minmax(0,1fr)`. */
  sizes: string;
  columns: SplitColumn[];
  className?: string | undefined;
}) => (
  <div
    className={clsx("grid h-full min-h-0", className)}
    style={{ gridTemplateColumns: sizes.split("_").join(" ") }}
  >
    {columns.map((column, index) => (
      <div
        key={column.key}
        className={clsx(
          "flex min-h-0 flex-col overflow-hidden",
          index < columns.length - 1 && "border-border border-e",
        )}
      >
        {column.header}
        <div className="min-h-0 flex-1 overflow-y-auto">{column.children}</div>
      </div>
    ))}
  </div>
);
