"use client";

import type { ComponentProps, ReactElement } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* The pieces every part of the block draws with                              */
/* -------------------------------------------------------------------------- */

export function Icon({
  icon,
  className,
}: {
  icon: IconSvgElement;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={1.75}
      aria-hidden
      {...(className ? { className } : {})}
    />
  );
}

export function Tip({
  label,
  side = "bottom",
  children,
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} aria-label={label} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export const focusRing =
  "outline-hidden focus-visible:ring-1 focus-visible:ring-foreground/20";

/*
 * One scale for the whole block.
 * Corners: 14px for a surface on the page, 10px for anything inside one, and
 * a full pill for buttons. The message box alone is rounder, at 24px.
 * List rows and text buttons are 32px tall; icon buttons are 28px.
 */
export const rSurface = "rounded-(--radius)";
export const rItem = "rounded-[calc(var(--radius)-4px)]";

export const listRow = `hover:bg-accent flex h-8 items-center gap-2 px-2 transition-colors motion-reduce:transition-none ${rItem} ${focusRing}`;

export const iconButton = `text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground/90 dark:hover:bg-foreground/[0.09] flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-3.5 ${focusRing}`;

/* A control that is only its words, 28px tall. */
export const textButton = `hover:bg-foreground/[0.06] data-popup-open:bg-foreground/[0.06] flex h-7 items-center gap-1 rounded-full px-2.5 text-sm leading-5 transition-colors motion-reduce:transition-none ${focusRing}`;

/* The filled button: one to a surface, for the thing it is there to do. */
export const inkButton = `bg-foreground text-background flex items-center justify-center rounded-full font-medium transition-[opacity,scale] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none ${focusRing}`;

/* A filled area with no border. */
export const field = "bg-foreground/4 dark:bg-foreground/6";

/* -------------------------------------------------------------------------- */
/* Menus: a solid popup, since it opens over pictures, with 28px rows         */
/* -------------------------------------------------------------------------- */

const menu =
  "bg-popover text-popover-foreground border-border/60 z-50 flex min-w-40 origin-(--transform-origin) flex-col rounded-(--radius) border p-1 text-[0.8125rem] leading-[1.125rem] shadow-(--float-shadow) outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:transition-none";

const menuItem =
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex min-h-7 shrink-0 items-center gap-2 rounded-[calc(var(--radius)-4px)] px-2 py-1 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 pointer-coarse:min-h-9 [&_svg]:size-3.5 [&_svg]:shrink-0";

export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;
export const MenuRadioGroup = MenuPrimitive.RadioGroup;

export function MenuPopup({
  side = "bottom",
  align = "start",
  sideOffset = 6,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "side" | "align" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50 outline-none"
      >
        <MenuPrimitive.Popup className={cn(menu, className)} {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return <MenuPrimitive.Item className={cn(menuItem, className)} {...props} />;
}

/** One of a set of choices: the chosen one carries a check at its end. */
export function MenuChoice({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      closeOnClick
      className={cn(menuItem, className)}
      {...props}
    >
      {children}
      <MenuPrimitive.RadioItemIndicator className="ms-auto ps-3">
        <Icon icon={Tick02Icon} />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

export function MenuLabel(props: ComponentProps<"p">) {
  return <p className="text-muted-foreground px-2 py-1" {...props} />;
}

export function MenuSeparator() {
  return (
    <MenuPrimitive.Separator className="bg-border mx-2 my-1 h-px shrink-0" />
  );
}
