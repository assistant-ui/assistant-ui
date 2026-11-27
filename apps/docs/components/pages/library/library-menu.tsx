"use client";

import type { ComponentProps } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

export const LibraryMenu = MenuPrimitive.Root;

export function LibraryMenuTrigger({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Trigger>) {
  return (
    <MenuPrimitive.Trigger
      className={cn(
        "bg-background/80 text-foreground ring-foreground/15 hover:bg-muted focus-visible:ring-ring data-popup-open:bg-muted grid size-8 cursor-pointer place-items-center rounded-full shadow-sm ring-1 backdrop-blur transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function LibraryMenuContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<
    ComponentProps<typeof MenuPrimitive.Positioner>,
    "align" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        sideOffset={sideOffset}
        className="z-50 outline-none"
      >
        <MenuPrimitive.Popup
          className={cn(
            "bg-popover text-popover-foreground ring-foreground/10 min-w-52 origin-(--transform-origin) rounded-xl p-1.5 shadow-lg ring-1 outline-none",
            "transition-[opacity,transform] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function LibraryMenuItem({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "data-highlighted:bg-foreground/[0.06] flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none select-none pointer-coarse:h-10",
        "[&_svg]:text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
