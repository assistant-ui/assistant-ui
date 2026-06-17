import clsx from "clsx";
import type { ReactNode } from "react";
import { BADGE_BASE, BADGE_SM, BADGE_TONE } from "./badgeTone";
import type { BadgeTone } from "./badgeTone";

export const ToneBadge = ({
  tone,
  size = "default",
  className,
  children,
}: {
  tone?: BadgeTone | undefined;
  size?: "default" | "sm";
  className?: string | undefined;
  children: ReactNode;
}) => (
  <span
    className={clsx(
      size === "sm" ? BADGE_SM : BADGE_BASE,
      BADGE_TONE[tone ?? "zinc"],
      className,
    )}
  >
    {children}
  </span>
);
