"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HintIconProps {
  hint: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function HintIcon({ hint, side = "right" }: HintIconProps) {
  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className="inline-flex text-muted-foreground/40 transition-colors hover:text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
        >
          <Info className="size-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
