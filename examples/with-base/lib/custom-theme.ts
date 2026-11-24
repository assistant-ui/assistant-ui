/*
 * What a person has changed in the Appearance settings: colors and a tint for
 * light and for dark, and a few choices that hold in both. It is all saved in
 * one cookie; the layout turns it into a stylesheet and page classes on the
 * server, so the first paint already has them. Only values checked here ever
 * reach that stylesheet.
 */

export const CUSTOM_THEME_COOKIE = "base_theme_custom";
export const CUSTOM_THEME_STYLE_ID = "base-theme-custom";

/** Names the format a copied theme is in, so a pasted one can be told apart. */
export const THEME_FORMAT = "base-theme-v1";

/** The colors that can be changed, and the variable each one sets. */
export const THEME_COLORS = [
  { key: "background", label: "Background", variable: "--surface" },
  { key: "foreground", label: "Foreground", variable: "--ink" },
  { key: "muted", label: "Muted", variable: "--muted" },
  { key: "border", label: "Border", variable: "--border" },
  { key: "brand", label: "Brand", variable: "--brand" },
] as const;

export type ThemeColorKey = (typeof THEME_COLORS)[number]["key"];

export type ThemeMode = "light" | "dark";

export type ThemeOverrides = {
  readonly [Key in ThemeColorKey]?: string;
} & {
  /** The hue every neutral is tinted with, 0 to 360. Unset, they are grey. */
  readonly tint?: number;
};

/** The highlighting themes for code, as a light and a dark shiki theme. */
export const CODE_THEMES = [
  {
    id: "github",
    label: "GitHub",
    light: "github-light-default",
    dark: "github-dark-default",
  },
  {
    id: "vitesse",
    label: "Vitesse",
    light: "vitesse-light",
    dark: "vitesse-dark",
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    light: "catppuccin-latte",
    dark: "catppuccin-mocha",
  },
  { id: "one", label: "One", light: "one-light", dark: "one-dark-pro" },
  {
    id: "solarized",
    label: "Solarized",
    light: "solarized-light",
    dark: "solarized-dark",
  },
  {
    id: "rose-pine",
    label: "Rosé Pine",
    light: "rose-pine-dawn",
    dark: "rose-pine",
  },
  {
    id: "everforest",
    label: "Everforest",
    light: "everforest-light",
    dark: "everforest-dark",
  },
  { id: "min", label: "Min", light: "min-light", dark: "min-dark" },
] as const;

export type CodeThemeId = (typeof CODE_THEMES)[number]["id"];

export const DEFAULT_CODE_THEME: CodeThemeId = "github";

/** Whether to move less than the system asks, or more. Unset follows it. */
export type MotionChoice = "reduce" | "allow";

export type CustomTheme = Readonly<Record<ThemeMode, ThemeOverrides>> & {
  readonly translucentSidebar?: boolean;
  readonly motion?: MotionChoice;
  readonly codeTheme?: CodeThemeId;
};

export const NO_CUSTOM_THEME: CustomTheme = { light: {}, dark: {} };

const HEX = /^#[0-9a-f]{6}$/;

export function isThemeColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row =>
  typeof value === "object" && value !== null;

function readOverrides(value: unknown): ThemeOverrides {
  if (!isRow(value)) return {};
  const overrides: {
    -readonly [Key in keyof ThemeOverrides]: ThemeOverrides[Key];
  } = {};
  for (const { key } of THEME_COLORS) {
    const color = value[key];
    if (isThemeColor(color)) overrides[key] = color;
  }
  const tint = value["tint"];
  if (typeof tint === "number" && Number.isFinite(tint))
    overrides.tint = Math.round(Math.min(Math.max(tint, 0), 360));
  return overrides;
}

/** Keeps what it understands of a parsed theme and leaves the rest out. */
export function readCustomTheme(value: unknown): CustomTheme {
  if (!isRow(value)) return NO_CUSTOM_THEME;
  const { translucentSidebar, motion, codeTheme } = value;
  const known = CODE_THEMES.find((theme) => theme.id === codeTheme);
  return {
    light: readOverrides(value["light"]),
    dark: readOverrides(value["dark"]),
    ...(translucentSidebar === true ? { translucentSidebar } : {}),
    ...(motion === "reduce" || motion === "allow" ? { motion } : {}),
    ...(known && known.id !== DEFAULT_CODE_THEME
      ? { codeTheme: known.id }
      : {}),
  };
}

/** Reads the cookie's value, or a theme someone pasted. */
export function parseCustomTheme(text: string | undefined): CustomTheme {
  if (!text) return NO_CUSTOM_THEME;
  try {
    return readCustomTheme(JSON.parse(text));
  } catch {
    return NO_CUSTOM_THEME;
  }
}

export function isCustomThemeEmpty(theme: CustomTheme) {
  return (
    Object.keys(theme).length === 2 &&
    Object.keys(theme.light).length === 0 &&
    Object.keys(theme.dark).length === 0
  );
}

function declarations(overrides: ThemeOverrides) {
  const parts: string[] = [];
  for (const { key, variable } of THEME_COLORS) {
    const color = overrides[key];
    if (color) parts.push(`${variable}:${color}`);
  }
  if (overrides.tint !== undefined)
    parts.push(`--tint:${overrides.tint}`, "--tint-on:1");
  return parts.join(";");
}

/*
 * The selectors carry one more class or type than the stylesheet's own, so
 * they win over it wherever this is placed. Each set applies only in its own
 * mode: by the page's class, or by the system when the page carries neither.
 */
export function customThemeCss(theme: CustomTheme) {
  const light = declarations(theme.light);
  const dark = declarations(theme.dark);
  return [
    light &&
      `html:root.light{${light}}@media (prefers-color-scheme:light){html:root:not(.dark){${light}}}`,
    dark &&
      `html:root.dark{${dark}}@media (prefers-color-scheme:dark){html:root:not(.light){${dark}}}`,
  ]
    .filter(Boolean)
    .join("");
}

/** The classes the page carries for the choices that are not colors. */
export const THEME_CLASSES = [
  "translucent-sidebar",
  "reduce-motion",
  "allow-motion",
] as const;

export function customThemeClasses(theme: CustomTheme): string[] {
  return [
    ...(theme.translucentSidebar ? ["translucent-sidebar"] : []),
    ...(theme.motion ? [`${theme.motion}-motion`] : []),
  ];
}
