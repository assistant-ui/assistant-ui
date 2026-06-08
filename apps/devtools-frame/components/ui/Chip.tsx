import clsx from "clsx";
import type { ReactNode } from "react";

export const Chip = ({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) => (
  <span
    className={clsx(
      "bg-muted text-muted-foreground inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
      className,
    )}
  >
    {children}
  </span>
);
