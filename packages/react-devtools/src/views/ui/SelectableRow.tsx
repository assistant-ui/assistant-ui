import clsx from "clsx";
import { forwardRef, type ReactNode } from "react";

/**
 * A row in a master rail. The leading border + accent fill mark the current
 * selection; the whole row is the hit target. Content is free-form so a row can
 * be a single line or a small block (a transcript turn).
 */
export const SelectableRow = forwardRef<
  HTMLButtonElement,
  {
    selected?: boolean;
    onSelect?: (() => void) | undefined;
    className?: string | undefined;
    /** Fixed-height row for uniform rails. */
    dense?: boolean;
    children: ReactNode;
  }
>(function SelectableRow(
  { selected = false, onSelect, className, dense = false, children },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={clsx(
        "block w-full overflow-hidden border-s-2 px-3 text-left text-[12px] transition-colors",
        dense ? "py-0" : "py-1.5",
        selected
          ? "border-foreground bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/40 border-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
});
