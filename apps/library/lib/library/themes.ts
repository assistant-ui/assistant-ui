import {
  THEME_ACCENT_COLORS,
  THEME_BASE_COLORS,
  type ThemeAccentColor,
  type ThemeBaseColor,
} from "./theme-colors";

/*
 * A theme is a shadcn preset: the look a project is set up with. Nothing here
 * is wired into assistant-ui yet. Still to do:
 * - Add the assistant-ui themes to the registry, and give `assistant-ui init`,
 *   `create`, and `setup` a theme option that passes the preset to shadcn, so
 *   a setup run by an agent stops taking shadcn's default.
 * - Install `@shadcn/registry` for its `encodePreset`, so a theme made here
 *   gets a short preset code. Until then it is applied by its address.
 * - Install the Tabler, Phosphor, and Remix icon packages, so a preview can
 *   draw the icon library a theme names.
 * - Ship each product theme's CSS overrides as a registry theme item, so they
 *   install with a command instead of being pasted into a stylesheet.
 */

export const NEW_THEME_PATH = "/themes/new";

export const THEME_SECTIONS = ["Products", "assistant-ui"] as const;

export const THEME_STYLES = [
  "nova",
  "vega",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
] as const;

export const THEME_ICON_LIBRARIES = {
  lucide: "Lucide",
  hugeicons: "Hugeicons",
  tabler: "Tabler",
  phosphor: "Phosphor",
  remixicon: "Remix Icon",
} as const;

export const THEME_FONTS = {
  inter: "Inter",
  "noto-sans": "Noto Sans",
  "nunito-sans": "Nunito Sans",
  figtree: "Figtree",
  roboto: "Roboto",
  raleway: "Raleway",
  "dm-sans": "DM Sans",
  "public-sans": "Public Sans",
  outfit: "Outfit",
  "jetbrains-mono": "JetBrains Mono",
  geist: "Geist",
  "geist-mono": "Geist Mono",
  lora: "Lora",
  merriweather: "Merriweather",
  "playfair-display": "Playfair Display",
  "noto-serif": "Noto Serif",
  "roboto-slab": "Roboto Slab",
  oxanium: "Oxanium",
  manrope: "Manrope",
  "space-grotesk": "Space Grotesk",
  montserrat: "Montserrat",
  "ibm-plex-sans": "IBM Plex Sans",
  "source-sans-3": "Source Sans 3",
  "instrument-sans": "Instrument Sans",
  "eb-garamond": "EB Garamond",
  "instrument-serif": "Instrument Serif",
} as const;

export const THEME_RADII = [
  "default",
  "none",
  "small",
  "medium",
  "large",
] as const;

export const THEME_MENU_ACCENTS = ["subtle", "bold"] as const;

export const THEME_MENU_COLORS = {
  default: "Default",
  inverted: "Inverted",
  "default-translucent": "Default, translucent",
  "inverted-translucent": "Inverted, translucent",
} as const;

export type ThemeStyle = (typeof THEME_STYLES)[number];
export type ThemeIconLibrary = keyof typeof THEME_ICON_LIBRARIES;
export type ThemeFont = keyof typeof THEME_FONTS;
export type ThemeRadius = (typeof THEME_RADII)[number];
export type ThemeMenuAccent = (typeof THEME_MENU_ACCENTS)[number];
export type ThemeMenuColor = keyof typeof THEME_MENU_COLORS;

/** The base color itself, or a color laid over it. */
export type ThemeColorChoice = "base" | ThemeAccentColor;

/** Everything a shadcn preset carries. */
export type ThemeSettings = {
  style: ThemeStyle;
  baseColor: ThemeBaseColor;
  theme: ThemeColorChoice;
  chartColor: ThemeColorChoice;
  iconLibrary: ThemeIconLibrary;
  font: ThemeFont;
  fontHeading: ThemeFont | "inherit";
  radius: ThemeRadius;
  menuAccent: ThemeMenuAccent;
  menuColor: ThemeMenuColor;
};

/** CSS variables laid over a preset's own, without their leading dashes. */
export type ThemeOverrides = Record<"light" | "dark", Record<string, string>>;

export type LibraryTheme = {
  slug: string;
  name: string;
  section: (typeof THEME_SECTIONS)[number];
  /** What `shadcn apply` takes: a preset's name, its code, or its address. */
  preset: string;
  /** The preset's code, which is its address on ui.shadcn.com/create. */
  code?: string;
  settings: ThemeSettings;
  /** What the nearest preset cannot express, for the project's stylesheet. */
  overrides?: ThemeOverrides;
};

export const themeTitle = (value: string) =>
  value[0]!.toUpperCase() + value.slice(1);

/** A theme's settings as one line: style, colors, icons, fonts, radius. */
export const themeSummary = (settings: ThemeSettings): string =>
  `${[
    `${themeTitle(settings.style)} style`,
    settings.baseColor,
    ...(settings.theme === "base" ? [] : [`${settings.theme} accent`]),
    ...(settings.chartColor === "base"
      ? []
      : [`${settings.chartColor} charts`]),
    `${THEME_ICON_LIBRARIES[settings.iconLibrary]} icons`,
    settings.fontHeading === "inherit"
      ? THEME_FONTS[settings.font]
      : `${THEME_FONTS[settings.font]} with ${THEME_FONTS[settings.fontHeading]} headings`,
    ...(settings.radius === "default" ? [] : [`${settings.radius} radius`]),
  ].join(", ")}.`;

/** The CSS variables a theme sets, without their leading dashes. */
export const themeVars = (
  settings: ThemeSettings,
  mode: "light" | "dark",
): Record<string, string> => {
  const vars: Record<string, string> = {
    ...THEME_BASE_COLORS[settings.baseColor][mode],
    ...(settings.theme !== "base" &&
      THEME_ACCENT_COLORS[settings.theme].theme[mode]),
    ...(settings.chartColor !== "base" &&
      THEME_ACCENT_COLORS[settings.chartColor].chart[mode]),
  };
  // A bold menu accent highlights rows in the primary color.
  if (settings.menuAccent === "bold") {
    vars["accent"] = vars["primary"]!;
    vars["accent-foreground"] = vars["primary-foreground"]!;
  }
  return vars;
};

const DEFAULT_SETTINGS = {
  baseColor: "neutral",
  theme: "base",
  chartColor: "base",
  fontHeading: "inherit",
  radius: "default",
  menuAccent: "subtle",
  menuColor: "default",
} as const satisfies Partial<ThemeSettings>;

/**
 * The address shadcn reads a preset's settings from. The CLI adds the
 * project's own component library and text direction when it applies one.
 */
export const themePresetUrl = (settings: ThemeSettings): string => {
  const params = new URLSearchParams({
    style: settings.style,
    baseColor: settings.baseColor,
    theme: settings.theme === "base" ? settings.baseColor : settings.theme,
    iconLibrary: settings.iconLibrary,
    font: settings.font,
    menuAccent: settings.menuAccent,
    menuColor: settings.menuColor,
    radius: settings.radius,
  });
  if (settings.chartColor !== "base")
    params.set("chartColor", settings.chartColor);
  if (settings.fontHeading !== "inherit")
    params.set("fontHeading", settings.fontHeading);
  return `https://ui.shadcn.com/init?${params}`;
};

type Pair = readonly [light: string, dark: string];

/**
 * A product's look: the preset nearest to it, and its own colors over that.
 * The colors are the ones the docs playground's presets use for the product.
 */
const product = (
  slug: string,
  name: string,
  settings: Pick<ThemeSettings, "style" | "iconLibrary" | "font"> &
    Partial<ThemeSettings>,
  colors: {
    background: Pair;
    foreground: Pair;
    mutedForeground: Pair;
    border: Pair;
    primary: Pair;
    primaryForeground: Pair;
    /** The user's message and other quiet fills. */
    muted?: Pair;
    /** The composer and floating surfaces. */
    surface?: Pair;
  },
): LibraryTheme => {
  const full = { ...DEFAULT_SETTINGS, ...settings };
  const mode = (index: 0 | 1): Record<string, string> => ({
    background: colors.background[index],
    foreground: colors.foreground[index],
    "card-foreground": colors.foreground[index],
    "popover-foreground": colors.foreground[index],
    "muted-foreground": colors.mutedForeground[index],
    border: colors.border[index],
    input: colors.border[index],
    primary: colors.primary[index],
    "primary-foreground": colors.primaryForeground[index],
    ring: colors.primary[index],
    ...(colors.muted && {
      muted: colors.muted[index],
      secondary: colors.muted[index],
      accent: colors.muted[index],
    }),
    ...(colors.surface && {
      card: colors.surface[index],
      popover: colors.surface[index],
    }),
  });
  return {
    slug,
    name,
    section: "Products",
    preset: themePresetUrl(full),
    settings: full,
    overrides: { light: mode(0), dark: mode(1) },
  };
};

const CODEX_SETTINGS: ThemeSettings = {
  ...DEFAULT_SETTINGS,
  style: "mira",
  theme: "blue",
  chartColor: "blue",
  iconLibrary: "hugeicons",
  font: "inter",
};

export const LIBRARY_THEMES: readonly LibraryTheme[] = [
  {
    // A preset alone, with no colors of its own over it yet.
    slug: "codex",
    name: "Codex",
    section: "Products",
    preset: themePresetUrl(CODEX_SETTINGS),
    settings: CODEX_SETTINGS,
  },
  product(
    "chatgpt",
    "ChatGPT",
    { style: "nova", iconLibrary: "lucide", font: "inter", radius: "large" },
    {
      background: ["#ffffff", "#212121"],
      foreground: ["#0d0d0d", "#ececec"],
      mutedForeground: ["#6e6e6e", "#9b9b9b"],
      border: ["#e5e5e5", "#424242"],
      primary: ["#10a37f", "#ffffff"],
      primaryForeground: ["#ffffff", "#0d0d0d"],
      muted: ["#f7f7f8", "#2f2f2f"],
      surface: ["#f7f7f8", "#2f2f2f"],
    },
  ),
  product(
    "claude",
    "Claude",
    {
      style: "maia",
      baseColor: "taupe",
      theme: "orange",
      chartColor: "orange",
      iconLibrary: "lucide",
      font: "inter",
      fontHeading: "lora",
    },
    {
      background: ["#faf9f5", "#2b2a27"],
      foreground: ["#3d3929", "#e8e4d9"],
      mutedForeground: ["#8b8579", "#9b9589"],
      border: ["#e5e0d5", "#3d3b36"],
      primary: ["#c96442", "#d4a27a"],
      primaryForeground: ["#ffffff", "#2b2a27"],
      muted: ["#f5f0e6", "#3d3b36"],
      surface: ["#ffffff", "#1f1e1b"],
    },
  ),
  product(
    "perplexity",
    "Perplexity",
    {
      style: "nova",
      baseColor: "mist",
      theme: "cyan",
      chartColor: "cyan",
      iconLibrary: "lucide",
      font: "instrument-sans",
      radius: "medium",
    },
    {
      background: ["#ffffff", "#0f172a"],
      foreground: ["#1e293b", "#e2e8f0"],
      mutedForeground: ["#64748b", "#94a3b8"],
      border: ["#e2e8f0", "#334155"],
      primary: ["#20b8cd", "#22d3ee"],
      primaryForeground: ["#0f172a", "#0f172a"],
      muted: ["#f1f5f9", "#1e293b"],
      surface: ["#f8fafc", "#1e293b"],
    },
  ),
  product(
    "gemini",
    "Gemini",
    {
      style: "maia",
      theme: "blue",
      chartColor: "blue",
      iconLibrary: "lucide",
      font: "outfit",
      radius: "large",
    },
    {
      background: ["#ffffff", "#1f1f1f"],
      foreground: ["#1f1f1f", "#e3e3e3"],
      mutedForeground: ["#5f6368", "#9aa0a6"],
      border: ["#e8eaed", "#3c4043"],
      primary: ["#1a73e8", "#8ab4f8"],
      primaryForeground: ["#ffffff", "#1f1f1f"],
      muted: ["#e8f0fe", "#303134"],
      surface: ["#ffffff", "#303134"],
    },
  ),
  product(
    "copilot",
    "Copilot",
    {
      style: "nova",
      baseColor: "mist",
      theme: "violet",
      chartColor: "violet",
      iconLibrary: "lucide",
      font: "inter",
    },
    {
      background: ["#ffffff", "#0d1117"],
      foreground: ["#1f2328", "#e6edf3"],
      mutedForeground: ["#656d76", "#7d8590"],
      border: ["#d0d7de", "#30363d"],
      primary: ["#8b5cf6", "#8b5cf6"],
      primaryForeground: ["#ffffff", "#ffffff"],
      muted: ["#f6f8fa", "#161b22"],
      surface: ["#f6f8fa", "#161b22"],
    },
  ),
  product(
    "slack",
    "Slack",
    {
      style: "nova",
      theme: "emerald",
      chartColor: "emerald",
      iconLibrary: "lucide",
      font: "noto-sans",
      radius: "small",
    },
    {
      background: ["#ffffff", "#1a1d21"],
      foreground: ["#1d1c1d", "#d1d2d3"],
      mutedForeground: ["#616061", "#ababad"],
      border: ["#dddddd", "#323539"],
      primary: ["#007a5a", "#2eb67d"],
      primaryForeground: ["#ffffff", "#1a1d21"],
    },
  ),
  product(
    "grok",
    "Grok",
    { style: "nova", iconLibrary: "lucide", font: "geist", radius: "large" },
    {
      background: ["#ffffff", "#000000"],
      foreground: ["#000000", "#ffffff"],
      mutedForeground: ["#52525b", "#71717a"],
      border: ["#e4e4e7", "#27272a"],
      primary: ["#000000", "#ffffff"],
      primaryForeground: ["#ffffff", "#000000"],
      muted: ["#f4f4f5", "#18181b"],
      surface: ["#f4f4f5", "#18181b"],
    },
  ),
  {
    // What templates/default pins, as `shadcn preset resolve` reads it there.
    slug: "assistant-ui",
    name: "assistant-ui",
    section: "assistant-ui",
    preset: "battZY",
    code: "battZY",
    settings: {
      ...DEFAULT_SETTINGS,
      style: "nova",
      baseColor: "zinc",
      iconLibrary: "lucide",
      font: "geist",
    },
  },
  {
    slug: "ai-ellie",
    name: "AI Ellie",
    section: "assistant-ui",
    preset: "b37aFvYpu",
    code: "b37aFvYpu",
    settings: {
      ...DEFAULT_SETTINGS,
      style: "nova",
      baseColor: "zinc",
      chartColor: "indigo",
      iconLibrary: "hugeicons",
      font: "geist",
      radius: "large",
      menuColor: "default-translucent",
    },
  },
];

export const getLibraryTheme = (slug: string): LibraryTheme | undefined =>
  LIBRARY_THEMES.find((theme) => theme.slug === slug);

/** `preset` is a preset's name, its code, or its address. */
export const themeApplyCommand = (preset: string) =>
  `npx shadcn@latest apply ${/^[\w-]+$/.test(preset) ? preset : `"${preset}"`}`;

const declarations = (vars: Record<string, string>) =>
  Object.entries(vars)
    .map(([name, value]) => `--${name}: ${value};`)
    .join(" ");

/** A theme's overrides as the rules a project adds to its global stylesheet. */
export const themeOverridesCss = (overrides: ThemeOverrides) =>
  `:root { ${declarations(overrides.light)} } .dark { ${declarations(overrides.dark)} }`;

/** Where a theme opens in the builder, as the place to start a new one from. */
export const themeBuilderHref = (slug: string) =>
  `${NEW_THEME_PATH}?from=${slug}`;
