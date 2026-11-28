import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labelled group of rows in a bordered box, like a settings panel. */
export function RowGroup({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-baseline justify-between gap-4 text-sm">
        <h3>{title}</h3>
        {aside}
      </div>
      <ul className="border-foreground/10 divide-foreground/10 divide-y rounded-(--library-thumb) border px-4">
        {children}
      </ul>
    </section>
  );
}

/** One row: an icon, a label, an optional value on the right, and an optional action after it. */
export function GroupRow({
  icon,
  label,
  value,
  action,
  mono = false,
}: {
  icon: ReactNode;
  label: ReactNode;
  value?: ReactNode;
  action?: ReactNode;
  mono?: boolean;
}) {
  return (
    <li className="flex min-h-12 min-w-0 items-center gap-3 py-2.5">
      <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
        {icon}
      </span>
      <span
        className={cn(
          "min-w-0 truncate",
          value ? "shrink-0" : "flex-1",
          mono
            ? "font-mono text-[13px] [font-variant-ligatures:none]"
            : "text-sm",
        )}
      >
        {label}
      </span>
      {value ? (
        <span className="text-muted-foreground flex min-w-0 flex-1 items-center justify-end gap-1.5 text-sm">
          {value}
        </span>
      ) : null}
      {action}
    </li>
  );
}
