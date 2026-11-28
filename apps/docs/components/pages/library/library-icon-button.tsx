"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  TooltipIconButton,
  type TooltipIconButtonProps,
} from "@/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@/lib/utils";

/** The assistant-ui tooltip icon button at the library's size and corner. */
export function LibraryIconButton({
  className,
  side = "top",
  ...props
}: TooltipIconButtonProps) {
  return (
    <TooltipIconButton
      side={side}
      className={cn(
        "text-muted-foreground size-8 cursor-pointer rounded-(--library-icon)",
        className,
      )}
      {...props}
    />
  );
}

/** A `LibraryIconButton` that opens the `Menu` it sits in. */
export function LibraryMenuIconButton({
  className,
  ...props
}: TooltipIconButtonProps) {
  return (
    <MenuPrimitive.Trigger
      render={
        <LibraryIconButton
          className={cn("pointer-coarse:size-9", className)}
          {...props}
        />
      }
    />
  );
}

/** Sits an icon button on the corner of a card's preview, see-through over what is drawn there. */
export const overPreview =
  "bg-background/45 text-foreground hover:bg-background/70 dark:hover:bg-background/70 focus-visible:bg-background/70 aria-expanded:bg-background/70 absolute top-3 right-3 z-10 backdrop-blur-md";
