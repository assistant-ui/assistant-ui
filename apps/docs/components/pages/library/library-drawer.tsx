"use client";

import type { ComponentProps } from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { cn } from "@/lib/utils";

// A right-side drawer on Base UI's Drawer, styled after shadcn's Base drawer:
// it slides in from the right, follows a swipe to the right, and closes when
// the swipe is far or fast enough.

export const LibraryDrawer = (
  props: ComponentProps<typeof DrawerPrimitive.Root>,
) => <DrawerPrimitive.Root swipeDirection="right" {...props} />;

export const LibraryDrawerTitle = DrawerPrimitive.Title;
export const LibraryDrawerDescription = DrawerPrimitive.Description;
export const LibraryDrawerClose = DrawerPrimitive.Close;

export function LibraryDrawerContent({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Popup>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none" />
      <DrawerPrimitive.Viewport className="pointer-events-auto fixed inset-0 z-50">
        <DrawerPrimitive.Popup
          className={cn(
            "bg-background ring-foreground/10 fixed inset-y-2 right-2 z-50 flex max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-(--library-floating) shadow-xl ring-1 outline-none",
            "[transform:translate3d(var(--drawer-swipe-movement-x,0px),0,0)] transition-transform duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
            "data-ending-style:[transform:translate3d(calc(100%+1rem),0,0)] data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] data-starting-style:[transform:translate3d(calc(100%+1rem),0,0)] data-swiping:duration-0 motion-reduce:transition-none",
            className,
          )}
          {...props}
        />
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}
