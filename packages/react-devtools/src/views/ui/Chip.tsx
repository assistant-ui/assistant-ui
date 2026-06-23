import clsx from "clsx";
import type { ReactNode } from "react";
import { BADGE_BASE } from "./badgeTone";

export const Chip = ({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) => (
  <span
    className={clsx(BADGE_BASE, "bg-muted text-muted-foreground", className)}
  >
    {children}
  </span>
);
