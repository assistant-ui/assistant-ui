"use client";

import * as React from "react";
import { ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@/lib/utils";

/*
 * History Buttons: Back and Forward for an app's own history. Each is a
 * TooltipIconButton, dimmed while there's nowhere to go. Not a shadcn
 * component: its API is its own.
 */
function HistoryButtons({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}) {
  return (
    <div
      data-slot="history-buttons"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    >
      <TooltipIconButton
        tooltip="Back"
        disabled={!canGoBack}
        onClick={onBack}
        className="size-7"
      >
        <HugeiconsIcon
          icon={ArrowLeft02Icon}
          strokeWidth={1.5}
          aria-hidden
          className="rtl:-scale-x-100"
        />
      </TooltipIconButton>
      <TooltipIconButton
        tooltip="Forward"
        disabled={!canGoForward}
        onClick={onForward}
        className="size-7"
      >
        <HugeiconsIcon
          icon={ArrowRight02Icon}
          strokeWidth={1.5}
          aria-hidden
          className="rtl:-scale-x-100"
        />
      </TooltipIconButton>
    </div>
  );
}

export { HistoryButtons };
