import { createContext, useContext } from "react";
import { processColor, useColorScheme } from "react-native";
import type { Color, TextSize, Weight } from "../ir";

export type NativeTheme = {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  destructive: string;
  input: string;
  hairline: string;
  success: string;
  warning: string;
  live: string;
  chart: readonly string[];
};

/** `hex` (`#rrggbb`) at `alpha` opacity. */
export const fade = (hex: string, alpha: number) =>
  `rgba(${Number.parseInt(hex.slice(1, 3), 16)}, ${Number.parseInt(hex.slice(3, 5), 16)}, ${Number.parseInt(hex.slice(5, 7), 16)}, ${alpha})`;

const light: NativeTheme = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#ffffff",
  primary: "#171717",
  primaryForeground: "#fafafa",
  secondary: "#f5f5f5",
  secondaryForeground: "#171717",
  accent: "#f5f5f5",
  destructive: "#e7000b",
  input: "#e5e5e5",
  hairline: fade("#e5e5e5", 0.6),
  success: "#2a984b",
  warning: "#d58300",
  live: "#2b7fff",
  chart: ["#f54900", "#009689", "#104e64", "#ffb900", "#fe9a00"],
};

const dark: NativeTheme = {
  background: "#0a0a0a",
  foreground: "#fafafa",
  card: "#171717",
  primary: "#e5e5e5",
  primaryForeground: "#171717",
  secondary: "#262626",
  secondaryForeground: "#fafafa",
  accent: "#262626",
  destructive: "#ff6467",
  input: fade("#ffffff", 0.15),
  hairline: fade("#ffffff", 0.06),
  success: "#44c166",
  warning: "#fcab00",
  live: "#51a2ff",
  chart: ["#1447e6", "#00bc7d", "#fe9a00", "#ad46ff", "#ff2056"],
};

/** The light or dark palette, following the device's color scheme. */
export const useNativeTheme = (): NativeTheme =>
  useColorScheme() === "dark" ? dark : light;

const InkContext = createContext<string | undefined>(undefined);

/** Sets the text color of a tinted surface for the components inside it. */
export const InkProvider = InkContext.Provider;

/** The text color of the surface a component renders on: the theme's foreground, or white inside a Card with its own background. */
export const useInk = () => {
  const ink = useContext(InkContext);
  const theme = useNativeTheme();
  return ink ?? theme.foreground;
};

const CardSurfaceContext = createContext(false);

/** Frames the Cards inside as surfaces, as each slide of a Carousel is. */
export const CardSurfaceProvider = CardSurfaceContext.Provider;

export const useCardSurface = () => useContext(CardSurfaceContext);

/** A color React Native can paint, or `undefined` for anything else, such as a CSS gradient. */
export const nativeColor = (value: unknown) =>
  typeof value === "string" && processColor(value) != null ? value : undefined;

/** A spacing token (0 to 8) in points, four per step. */
export const space = (token: unknown, fallback: number) =>
  typeof token === "number" && token >= 0 ? token * 4 : fallback;

/** A CSS length the model wrote as a React Native dimension: points, a percentage, or `undefined` for other units. */
export const dimension = (
  value: unknown,
): number | `${number}%` | undefined => {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const match = /^(-?\d*\.?\d+)(px|rem|%)?$/.exec(value.trim());
  if (!match) return undefined;
  const amount = Number(match[1]);
  return match[2] === "%"
    ? `${amount}%`
    : match[2] === "rem"
      ? amount * 16
      : amount;
};

export const RADIUS = { control: 8, surface: 10, pill: 9999 } as const;

export const TEXT_SIZE: Record<TextSize, number> = {
  sm: 12,
  md: 14,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 36,
};

export const FONT_WEIGHT: Record<Weight, "400" | "500" | "600" | "700"> = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

/** The color for a text color token, relative to the surface's `ink`. */
export const textColor = (
  color: Color | undefined,
  ink: string,
  theme: NativeTheme,
) => {
  switch (color) {
    case "emphasis":
      return theme.foreground;
    case "secondary":
      return fade(ink, 0.62);
    case "alpha-70":
      return fade(theme.foreground, 0.7);
    case "white":
      return "#ffffff";
    case "white-70":
      return fade("#ffffff", 0.7);
    case "white-50":
      return fade("#ffffff", 0.5);
    default:
      return ink;
  }
};
