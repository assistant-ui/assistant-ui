"use client";

import type { ComponentProps } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const LibraryMenu = MenuPrimitive.Root;

export function LibraryMenuTrigger({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Trigger>) {
  return (
    <MenuPrimitive.Trigger
      className={cn(
        "focus-visible:ring-ring grid cursor-pointer place-items-center transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function LibraryMenuContent({
  className,
  align = "end",
  side = "bottom",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<
    ComponentProps<typeof MenuPrimitive.Positioner>,
    "align" | "side" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        side={side}
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

const itemRow =
  "data-highlighted:bg-foreground/[0.06] flex h-8 cursor-pointer items-center gap-2.5 rounded-lg ps-2.5 pe-2 text-sm outline-none select-none pointer-coarse:h-10 [&_svg]:size-4 [&_svg]:shrink-0";

export const LibraryMenuGroup = MenuPrimitive.Group;

export function LibraryMenuLabel({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.GroupLabel>) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn(
        "text-muted-foreground px-2.5 pt-1.5 pb-1 text-xs",
        className,
      )}
      {...props}
    />
  );
}

export function LibraryMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      className={cn("bg-foreground/10 -mx-1.5 my-1.5 h-px", className)}
      {...props}
    />
  );
}

export const LibraryMenuRadioGroup = MenuPrimitive.RadioGroup;

export function LibraryMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cn(itemRow, className)} {...props}>
      {children}
      <MenuPrimitive.RadioItemIndicator className="ms-auto">
        <CheckIcon aria-hidden />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

export function LibraryMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem className={cn(itemRow, className)} {...props}>
      {children}
      <MenuPrimitive.CheckboxItemIndicator className="ms-auto">
        <CheckIcon aria-hidden />
      </MenuPrimitive.CheckboxItemIndicator>
    </MenuPrimitive.CheckboxItem>
  );
}

export const LibraryMenuSub = MenuPrimitive.SubmenuRoot;

export function LibraryMenuSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.SubmenuTrigger>) {
  return (
    <MenuPrimitive.SubmenuTrigger
      className={cn(itemRow, "data-popup-open:bg-foreground/[0.06]", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon aria-hidden className="text-muted-foreground ms-auto" />
    </MenuPrimitive.SubmenuTrigger>
  );
}
