import type { ReactNode } from "react";

/**
 * A flat content section: a header row (title + optional count/action) over its
 * content. No box, no nesting; sections are separated by whitespace on the
 * panel surface.
 */
export const InfoCard = ({
  title,
  count,
  action,
  children,
}: {
  title?: ReactNode;
  count?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-2">
    {title != null || action != null ? (
      <div className="flex h-5 items-center justify-between gap-2">
        <h3 className="text-foreground flex items-center gap-1.5 text-[13px] font-medium">
          {title}
          {count != null ? (
            <span className="text-muted-foreground text-[11px] font-normal tabular-nums">
              {count}
            </span>
          ) : null}
        </h3>
        {action}
      </div>
    ) : null}
    {children}
  </section>
);
