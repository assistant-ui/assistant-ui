import type { ReactNode } from "react";

/**
 * Fixed-height rail header. Every column in a split layout should use this so
 * titles line up across columns.
 */
export const PaneHeader = ({
  children,
  trailing,
  borderless = false,
}: {
  children: ReactNode;
  trailing?: ReactNode | undefined;
  borderless?: boolean;
}) => (
  <div
    className={
      borderless
        ? "bg-background flex h-8 max-h-8 min-h-8 shrink-0 items-center justify-between gap-2 overflow-hidden px-3"
        : "border-border bg-background flex h-8 max-h-8 min-h-8 shrink-0 items-center justify-between gap-2 overflow-hidden border-b px-3"
    }
  >
    <div className="text-muted-foreground flex min-w-0 flex-1 items-center truncate text-[11px] leading-none tabular-nums">
      {children}
    </div>
    {trailing ? (
      <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-[10px] leading-none">
        {trailing}
      </div>
    ) : null}
  </div>
);

/** Header that grows below a {@link PaneHeader}-height title row. */
export const PaneHeaderStack = ({
  header,
  children,
}: {
  header: ReactNode;
  children?: ReactNode | undefined;
}) => (
  <div className="border-border bg-background shrink-0 border-b">
    {header}
    {children ? <div className="border-border border-t">{children}</div> : null}
  </div>
);
