import clsx from "clsx";
import type { ReactNode } from "react";
import { BADGE_BASE, BADGE_TONE } from "./badgeTone";
import type { BadgeTone } from "./badgeTone";

export const ToneBadge = ({
  tone,
  className,
  children,
}: {
  tone?: BadgeTone | undefined;
  className?: string | undefined;
  children: ReactNode;
}) => (
  <span className={clsx(BADGE_BASE, BADGE_TONE[tone ?? "zinc"], className)}>
    {children}
  </span>
);
