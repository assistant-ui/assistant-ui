"use client";

import type { ReactNode } from "react";
import { GlobeIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  isLoading?: boolean;
  isActive?: boolean;
  actions?: ReactNode;
};

/**
 * Chrome-style active tab: rounded top + concave bottom curves via box-shadow.
 * Sits on a darker tab strip; background matches the preview content below.
 */
export function XuluxPreviewTabBar({
  title,
  isLoading = false,
  isActive = true,
  actions,
}: Props) {
  return (
    <div
      className="flex h-9 shrink-0 items-end gap-1 bg-[#e8eaed] pt-1 pr-1 pl-2 dark:bg-[#202124]"
      role="tablist"
    >
      {/* overflow-visible so the left/right tab swoosh curves aren't clipped */}
      <div className="flex min-w-0 flex-1 items-end overflow-visible">
        <div
          role="tab"
          aria-selected={isActive}
          className={cn(
            "relative flex h-8 max-w-[min(260px,52vw)] min-w-[120px] shrink-0 items-center gap-1.5 px-3 text-xs",
            "bg-background text-foreground rounded-t-[10px]",
            "before:absolute before:bottom-0 before:-left-[10px] before:z-0 before:h-[10px] before:w-[10px] before:rounded-br-[10px] before:shadow-[5px_5px_0_5px_var(--background)]",
            "after:absolute after:-right-[10px] after:bottom-0 after:z-0 after:h-[10px] after:w-[10px] after:rounded-bl-[10px] after:shadow-[-5px_5px_0_5px_var(--background)]",
            !isActive && "bg-muted/80 text-muted-foreground opacity-80",
          )}
        >
          <GlobeIcon className="text-muted-foreground relative z-[1] size-3.5 shrink-0" />
          <span className="relative z-[1] min-w-0 flex-1 truncate font-medium">
            {title}
          </span>
          {isLoading && (
            <Loader2 className="text-muted-foreground relative z-[1] size-3 shrink-0 animate-spin" />
          )}
        </div>
      </div>

      {actions ? (
        <div className="mb-0.5 flex shrink-0 items-center gap-0.5 pr-0.5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
