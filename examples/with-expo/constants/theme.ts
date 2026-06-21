/**
 * Design tokens for the assistant-ui Expo example.
 *
 * These mirror the canonical web kit (`packages/ui`): a neutral zinc palette,
 * a clean ChatGPT-grade look with subtle hairline borders and no heavy glass or
 * shadow. Values are the sRGB equivalents of the web `oklch` tokens.
 */

export type Palette = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  border: string;
  primary: string;
  primaryForeground: string;
  composer: string;
  destructive: string;
  destructiveForeground: string;
  destructiveSurface: string;
  ring: string;
};

export const Colors: { light: Palette; dark: Palette } = {
  light: {
    background: "#ffffff",
    foreground: "#18181b",
    card: "#ffffff",
    cardForeground: "#18181b",
    muted: "#f4f4f5",
    mutedForeground: "#71717a",
    accent: "#f4f4f5",
    border: "#e4e4e7",
    primary: "#18181b",
    primaryForeground: "#fafafa",
    composer: "#fafafa",
    destructive: "#dc2626",
    destructiveForeground: "#ffffff",
    destructiveSurface: "rgba(220, 38, 38, 0.08)",
    ring: "#a1a1aa",
  },
  dark: {
    background: "#18181b",
    foreground: "#fafafa",
    card: "#27272a",
    cardForeground: "#fafafa",
    muted: "#3f3f46",
    mutedForeground: "#a1a1aa",
    accent: "#3f3f46",
    border: "rgba(255, 255, 255, 0.1)",
    primary: "#e4e4e7",
    primaryForeground: "#18181b",
    composer: "#232326",
    destructive: "#f87171",
    destructiveForeground: "#18181b",
    destructiveSurface: "rgba(248, 113, 113, 0.12)",
    ring: "#52525b",
  },
};

export const Radius = {
  sm: 6,
  md: 8,
  lg: 10,
  card: 16,
  bubble: 18,
  composer: 24,
  attachment: 14,
  pill: 999,
} as const;

export const Spacing = {
  threadMaxWidth: 768,
  gutter: 16,
} as const;
