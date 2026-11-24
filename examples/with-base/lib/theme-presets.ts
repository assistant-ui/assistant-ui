import type {
  ThemeColorKey,
  ThemeMode,
  ThemeOverrides,
} from "@/lib/custom-theme";

/*
 * Looks to start a theme from: a product's colors for light and for dark.
 * They are the ones the Library app's product themes use; Cursor's are read
 * from the theme variables of its own website.
 */

export type ThemePreset = {
  id: string;
  label: string;
} & Readonly<Record<ThemeMode, ThemeOverrides>>;

type Pair = readonly [light: string, dark: string];

const preset = (
  id: string,
  label: string,
  colors: Readonly<Record<ThemeColorKey, Pair>>,
): ThemePreset => {
  const mode = (index: 0 | 1): ThemeOverrides => ({
    background: colors.background[index],
    foreground: colors.foreground[index],
    muted: colors.muted[index],
    border: colors.border[index],
    brand: colors.brand[index],
  });
  return { id, label, light: mode(0), dark: mode(1) };
};

export const THEME_PRESETS: readonly ThemePreset[] = [
  preset("chatgpt", "ChatGPT", {
    background: ["#ffffff", "#212121"],
    foreground: ["#0d0d0d", "#ececec"],
    muted: ["#f7f7f8", "#2f2f2f"],
    border: ["#e5e5e5", "#424242"],
    brand: ["#10a37f", "#10a37f"],
  }),
  preset("claude", "Claude", {
    background: ["#faf9f5", "#2b2a27"],
    foreground: ["#3d3929", "#e8e4d9"],
    muted: ["#f5f0e6", "#3d3b36"],
    border: ["#e5e0d5", "#3d3b36"],
    brand: ["#c96442", "#d4a27a"],
  }),
  preset("codex", "Codex", {
    background: ["#ffffff", "#000000"],
    foreground: ["#171717", "#ededed"],
    muted: ["#f3f3f3", "#1c1c1c"],
    border: ["#ebebeb", "#1f1f1f"],
    brand: ["#006aff", "#006aff"],
  }),
  preset("copilot", "Copilot", {
    background: ["#ffffff", "#0d1117"],
    foreground: ["#1f2328", "#e6edf3"],
    muted: ["#f6f8fa", "#161b22"],
    border: ["#d0d7de", "#30363d"],
    brand: ["#8b5cf6", "#8b5cf6"],
  }),
  preset("cursor", "Cursor", {
    background: ["#f7f7f4", "#14120b"],
    foreground: ["#26251e", "#edecec"],
    muted: ["#f2f1ed", "#1b1913"],
    border: ["#e6e5e0", "#26241e"],
    brand: ["#f54e00", "#f54e00"],
  }),
  preset("gemini", "Gemini", {
    background: ["#ffffff", "#1f1f1f"],
    foreground: ["#1f1f1f", "#e3e3e3"],
    muted: ["#e8f0fe", "#303134"],
    border: ["#e8eaed", "#3c4043"],
    brand: ["#1a73e8", "#8ab4f8"],
  }),
  preset("grok", "Grok", {
    background: ["#ffffff", "#000000"],
    foreground: ["#000000", "#ffffff"],
    muted: ["#f4f4f5", "#18181b"],
    border: ["#e4e4e7", "#27272a"],
    brand: ["#000000", "#ffffff"],
  }),
  preset("perplexity", "Perplexity", {
    background: ["#ffffff", "#0f172a"],
    foreground: ["#1e293b", "#e2e8f0"],
    muted: ["#f1f5f9", "#1e293b"],
    border: ["#e2e8f0", "#334155"],
    brand: ["#20b8cd", "#22d3ee"],
  }),
];
