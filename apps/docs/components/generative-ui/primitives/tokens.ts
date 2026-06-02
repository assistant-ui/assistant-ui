import type { ReactNode } from "react";

// Fixed token -> full class strings so Tailwind's JIT picks them up.
export const ALIGN = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
} as const;

export const JUSTIFY = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

export const SIZE = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
} as const;

export const COLOR = {
  emphasis: "text-foreground",
  secondary: "text-muted-foreground",
  "alpha-70": "text-foreground/70",
  white: "text-white",
  "white-70": "text-white/70",
  "white-50": "text-white/50",
} as const;

export const WEIGHT = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

export const TEXT_ALIGN = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

export const RADIUS = { sm: 4, md: 8, lg: 12, full: 9999 } as const;

export const cls = <T extends string>(
  map: Record<T, string>,
  key: T | undefined,
): string | undefined => (key ? map[key] : undefined);

// Spacing units follow Tailwind's 0.25rem scale (gap: 3 -> 12px).
export const space = (n: number | undefined): string | undefined =>
  n === undefined ? undefined : `${n * 4}px`;

export type Common = { children?: ReactNode };
