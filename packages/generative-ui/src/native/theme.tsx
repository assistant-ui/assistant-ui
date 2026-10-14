import { createContext, useContext, type ReactNode } from "react";
import { processColor, useColorScheme } from "react-native";
import type { Color, TextSize, Weight } from "../ir";
import { useElementDepth } from "../spec/elementDepth";

export type NativeTheme = {
  background: string;
  foreground: string;
  card: string;
  panel: string;
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

type Oklab = readonly [number, number, number];

const toOklab = (hex: string): Oklab => {
  const linearize = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const red = linearize(Number.parseInt(hex.slice(1, 3), 16) / 255);
  const green = linearize(Number.parseInt(hex.slice(3, 5), 16) / 255);
  const blue = linearize(Number.parseInt(hex.slice(5, 7), 16) / 255);
  const l = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const m = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const s = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  );
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ] as const;
};

const fromOklab = ([lightness, a, b]: Oklab) => {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const encode = (channel: number) => {
    const clamped = Math.max(0, Math.min(1, channel));
    const srgb =
      clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(srgb * 255);
  };
  return [
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

/** Mixes a `#rrggbb` tone at 60% with 40% ink in Oklab. */
export const toneTextColor = (tone: string, foreground: string) => {
  const [lightness, a, b] = toOklab(tone);
  const [foregroundLightness, foregroundA, foregroundB] = toOklab(foreground);
  const mixed = fromOklab([
    lightness * 0.6 + foregroundLightness * 0.4,
    a * 0.6 + foregroundA * 0.4,
    b * 0.6 + foregroundB * 0.4,
  ]);
  return `rgb(${mixed.join(", ")})`;
};

const light: NativeTheme = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#ffffff",
  panel: fade("#0a0a0a", 0.04),
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
  panel: fade("#fafafa", 0.06),
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

const InsideCardContext = createContext(false);

/** Marks the content of a Card, so a Card inside it renders plain instead of as a second panel. */
export const InsideCardProvider = InsideCardContext.Provider;

export const useInsideCard = () => useContext(InsideCardContext);

const RowDepthContext = createContext<number | undefined>(undefined);

/** Marks the content of a Row, where a Fact directly inside reads as a headline figure and an Image as a gallery tile. */
export function RowContent({ children }: { children?: ReactNode }) {
  const depth = useElementDepth();
  return (
    <RowDepthContext.Provider value={depth}>
      {children}
    </RowDepthContext.Provider>
  );
}

/** Whether the caller's element sits directly in a Row rather than deeper inside one of its children. */
export const useRowChild = () => {
  const row = useContext(RowDepthContext);
  const depth = useElementDepth();
  return row !== undefined && depth === row + 1;
};

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
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (typeof value !== "string") return undefined;
  const match = /^(-?\d*\.?\d+)(px|rem|%)?$/.exec(value.trim());
  if (!match) return undefined;
  const amount = Number(match[1]);
  if (amount < 0) return undefined;
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
