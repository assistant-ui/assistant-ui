import clsx from "clsx";
import type { ReactNode } from "react";
import { BADGE_TONE } from "./badgeTone";
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
  <span
    className={clsx(
      "rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
      BADGE_TONE[tone ?? "zinc"],
      className,
    )}
  >
    {children}
  </span>
);
