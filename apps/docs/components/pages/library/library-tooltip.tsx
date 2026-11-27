"use client";

import type { ReactElement } from "react";
import { Tooltip } from "@base-ui/react/tooltip";

export const LibraryTooltipGroup = Tooltip.Provider;

/** Shows `label` beside `children`, which must be a single element that accepts a ref. */
export function LibraryTooltip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactElement<Record<string, unknown>>;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={8} className="z-50">
          <Tooltip.Popup className="bg-foreground text-background origin-(--transform-origin) rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap shadow-md transition-[opacity,transform] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
