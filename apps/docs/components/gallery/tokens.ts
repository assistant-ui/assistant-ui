import type { ClassValue } from "clsx";

/** Maps IR token enums to Tailwind class strings so the JIT picks them up. The
 * gallery's styled library is one concrete "bring your own style" implementation
 * over the unstyled `defaultGenerativeUILibrary` contract; these tokens are how
 * the standard's enums become real CSS. */
export const TEXT_SIZE: Record<string, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
};

export const HEADER_SIZE: Record<string, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-2xl",
  "2xl": "text-3xl",
  "3xl": "text-4xl",
};

export const WEIGHT: Record<string, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export const COLOR: Record<string, string> = {
  emphasis: "text-foreground",
  secondary: "text-muted-foreground",
  "alpha-70": "text-foreground/70",
  white: "text-white",
  "white-70": "text-white/70",
  "white-50": "text-white/50",
};

export const ALIGN: Record<string, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
};

export const JUSTIFY: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export const GAP: Record<number, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
};

export const PADDING: Record<number, string> = {
  0: "p-0",
  1: "p-1",
  2: "p-2",
  3: "p-3",
  4: "p-4",
  6: "p-6",
  8: "p-8",
};

export const BUTTON_STYLE: Record<string, string> = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive",
};

/** Resolves a token to its class, falling back to the default when the model
 * emits a value the map doesn't cover. */
export const token = (
  map: Record<string, string>,
  value: string | undefined,
  fallback: string,
): string => (value && value in map ? map[value]! : fallback);

/** Resolves a numeric token (gap/padding in 4px units) to a class, clamped. */
export const numericToken = (
  map: Record<number, string>,
  value: number | undefined,
  fallback: string,
): string => (value !== undefined && value in map ? map[value]! : fallback);

/** Resolves a numeric-or-string image size to a class. */
export const imageSize = (size: string | number | undefined): ClassValue => {
  if (size === undefined) return "h-auto";
  if (typeof size === "number") return { height: `${size}px` };
  const map: Record<string, string> = {
    sm: "h-16",
    md: "h-32",
    lg: "h-48",
  };
  return size in map ? map[size]! : "h-auto";
};

export const ALERT_TONE: Record<string, { variant: string; icon: string }> = {
  info: { variant: "default", icon: "Info" },
  success: { variant: "default", icon: "CheckCircle" },
  warning: { variant: "default", icon: "AlertTriangle" },
  danger: { variant: "destructive", icon: "AlertCircle" },
};
