"use client";

import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const VARIANTS = {
  deprecated: {
    label: "deprecated",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    tooltip: undefined,
  },
  unstable: {
    label: "unstable",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    tooltip: "Experimental: API or behavior may change in the future.",
  },
} as const;

export type StatusBadgeVariant = keyof typeof VARIANTS;

type StatusBadgeProps = {
  variant: StatusBadgeVariant;
  children?: ReactNode;
  tooltip?: ReactNode;
  className?: string;
};

export function StatusBadge({
  variant,
  children = VARIANTS[variant].label,
  tooltip = VARIANTS[variant].tooltip,
  className,
}: StatusBadgeProps) {
  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-medium text-xs",
        VARIANTS[variant].className,
        className,
      )}
    >
      {children}
    </span>
  );

  if (!tooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-56 text-balance"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
