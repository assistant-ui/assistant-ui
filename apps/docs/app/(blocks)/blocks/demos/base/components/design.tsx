"use client";

import type { ReactElement } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/*
 * The block's design in one place: a single scale for corners, text and
 * control sizes, shared by the chat and its sidebar.
 *
 * Corners: --radius for a surface on the page, 4px less for anything inside
 * one, and a full pill for buttons and chips. The composer alone is rounder.
 * Text: 14px for messages and the interface, 16px for what you type, 13px
 * inside menus, 12px for counts and code.
 * Chips, text buttons and list rows are 32px tall; icon buttons are 28px.
 */

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

/** A Hugeicons glyph as a component, for APIs that take an icon component. */
export function iconComponent(icon: IconSvgElement) {
  function IconComponent({ className }: { className?: string }) {
    return <Icon icon={icon} {...(className ? { className } : {})} />;
  }
  return IconComponent;
}

/** A label shown on hover and focus, which also names the control. */
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

export const rSurface = "rounded-(--radius)";
export const rItem = "rounded-[calc(var(--radius)-4px)]";
export const textReading = "text-sm leading-[1.375rem]";
export const textControl = "text-sm leading-5";

/* A row in a list: 32px tall, 8px side padding. */
export const listRow = cn(
  "hover:bg-accent flex h-8 items-center gap-2 px-2 transition-colors motion-reduce:transition-none",
  rItem,
  focusRing,
);

export const iconButton = cn(
  "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground/90 dark:hover:bg-foreground/[0.09] flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-3.5",
  focusRing,
);

/* The filled send and stop buttons. */
export const inkButton = cn(
  "bg-primary text-primary-foreground hover:bg-primary/90 flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,opacity,scale] duration-150 active:scale-[0.96] disabled:opacity-30 motion-reduce:transition-none [&_svg]:size-4",
  focusRing,
);

export const iconSwap =
  "[grid-area:1/1] transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none";
export const iconSwapIn = "scale-100 opacity-100 blur-none";
export const iconSwapOut = "scale-[0.25] opacity-0 blur-[4px]";

/* A filled area with no border. */
export const field = "bg-foreground/4 dark:bg-foreground/6";

/* Paper: a quiet surface on the page. Only floating layers carry a shadow. */
export const paper = "bg-background border-border/60 border";

/* A suggestion chip: paper, 32px tall. */
export const chip = cn(
  paper,
  "hover:bg-accent data-[active=true]:bg-accent flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 whitespace-nowrap transition-colors motion-reduce:transition-none [&_svg]:size-3.5",
  textControl,
  focusRing,
);

/* A small text button, the same height as a chip. */
export const textButton = cn(
  "flex h-8 items-center rounded-full px-3.5 transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none",
  textControl,
  focusRing,
);

/* Floating: glass with the one shadow, for layers above the page. */
export const floating =
  "border-border/60 border bg-(--glass) shadow-(--float-shadow) backdrop-blur-(--glass-blur) not-supports-[backdrop-filter:blur(1px)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none";

/* A quote: muted text behind a short rounded bar. */
export const quote = cn(
  "text-muted-foreground before:bg-foreground/20 relative min-w-0 ps-3 before:absolute before:inset-y-0.5 before:start-0 before:w-0.5 before:rounded-full",
  textControl,
);

/* A menu: a glass popup with the float shadow, 13px text and 26px rows. */
export const menu =
  "text-popover-foreground border-border/60 z-50 flex min-w-40 origin-(--radix-dropdown-menu-content-transform-origin) flex-col rounded-(--radius) border bg-(--glass) p-1 text-[0.8125rem] leading-[1.125rem] font-[380] shadow-(--float-shadow) outline-none backdrop-blur-(--glass-blur) [--accent:var(--glass-hover)] [--muted-foreground:var(--glass-muted-foreground)] not-supports-[backdrop-filter:blur(1px)]:bg-popover data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-96 data-[state=open]:duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-96 data-[state=closed]:duration-100 motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100 [@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none";

export const menuItem =
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex h-6.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-[calc(var(--radius)-4px)] px-2 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 pointer-coarse:h-9 [&_svg]:size-3.5 [&_svg]:shrink-0";

/* Shown only while the pointer is over the message, or focus is inside it. */
export const actionBar =
  "flex gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 has-data-[state=open]:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100";

/* Trace lines: reasoning and tool calls as plain muted rows that expand. */
export const traceTrigger = cn(
  "text-muted-foreground hover:text-foreground flex w-fit max-w-full min-w-0 items-center gap-1 rounded-full text-start transition-colors motion-reduce:transition-none",
  textControl,
  focusRing,
);
export const traceDetail =
  "border-border/60 ms-2 flex flex-col gap-2 border-s ps-4";

export function TraceChevron({ open }: { open: boolean }) {
  return (
    <Icon
      icon={ArrowRight01Icon}
      className={cn(
        "size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none",
        open ? "rotate-90" : "rtl:rotate-180",
      )}
    />
  );
}
