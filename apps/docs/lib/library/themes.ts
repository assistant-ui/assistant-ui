import { CODE_THEMES, codeThemeCss, type CodeThemeId } from "./code-themes";

/** A radius at its slider's end means fully round. */
export const RADIUS_FULL = 40;

/** The corners a theme sets, each with what it shapes. Values are in px. */
export const LIBRARY_RADII = [
  { key: "control", label: "Buttons" },
  { key: "icon", label: "Icon buttons" },
  { key: "item", label: "Menu rows" },
  { key: "surface", label: "Menus" },
  { key: "floating", label: "Dialogs" },
  { key: "card", label: "Cards" },
  { key: "thumb", label: "Row icons" },
] as const;

export type LibraryRadiusKey = (typeof LIBRARY_RADII)[number]["key"];

/**
 * The type a theme sets: the page title and the line under it. Sizes are in
 * px; spacing is letter spacing in thousandths of an em; line height is in
 * hundredths of the size.
 */
export const LIBRARY_TYPE = [
  {
    title: "Title",
    settings: [
      { key: "titleSize", label: "Size", min: 24, max: 80, step: 1 },
      { key: "titleWeight", label: "Weight", min: 300, max: 800, step: 10 },
      { key: "titleTracking", label: "Spacing", min: -80, max: 30, step: 1 },
      { key: "titleLeading", label: "Line height", min: 90, max: 160, step: 1 },
    ],
  },
  {
    title: "Text",
    settings: [
      { key: "textSize", label: "Size", min: 13, max: 20, step: 1 },
      { key: "textWeight", label: "Weight", min: 300, max: 700, step: 10 },
      { key: "textTracking", label: "Spacing", min: -30, max: 30, step: 1 },
      { key: "textLeading", label: "Line height", min: 110, max: 200, step: 1 },
    ],
  },
] as const;

export type LibraryTypeKey =
  (typeof LIBRARY_TYPE)[number]["settings"][number]["key"];

/** The typefaces a theme can pick; `site` is the docs site's own. */
export const LIBRARY_FONTS = {
  sans: [
    { id: "site", label: "Public Sans" },
    { id: "geist", label: "Geist" },
    { id: "inter", label: "Inter" },
  ],
  mono: [
    { id: "site", label: "JetBrains Mono" },
    { id: "geist-mono", label: "Geist Mono" },
  ],
} as const;

export type LibrarySansId = (typeof LIBRARY_FONTS)["sans"][number]["id"];
export type LibraryMonoId = (typeof LIBRARY_FONTS)["mono"][number]["id"];

/** The neutrals a theme can retune, per color mode; every one sits on the tint's hue. */
export const LIBRARY_COLORS = [
  { key: "background", label: "Background", alpha: false },
  { key: "foreground", label: "Foreground", alpha: false },
  { key: "muted", label: "Muted", alpha: false },
  { key: "muted-foreground", label: "Muted text", alpha: false },
  { key: "border", label: "Border", alpha: true },
] as const;

export type LibraryColorKey = (typeof LIBRARY_COLORS)[number]["key"];
export type LibraryMode = "light" | "dark";

/** A color as lightness (0 to 1), chroma (0 to 0.37), and opacity (0 to 100); its hue is the tint. */
export type LibraryColor = { l: number; c: number; a: number };

export type LibraryColors = Record<
  LibraryMode,
  Record<LibraryColorKey, LibraryColor>
>;

const color = (l: number, c: number, a = 100): LibraryColor => ({ l, c, a });

/** The site's own neutrals (styles/globals.css). */
const SITE_COLORS: LibraryColors = {
  light: {
    background: color(0.992, 0.002),
    foreground: color(0.145, 0.006),
    muted: color(0.97, 0.004),
    "muted-foreground": color(0.556, 0.007),
    border: color(0.145, 0.006, 10),
  },
  dark: {
    background: color(0.17, 0.003),
    foreground: color(0.985, 0.002),
    muted: color(0.275, 0.004),
    "muted-foreground": color(0.708, 0.004),
    border: color(0.985, 0.002, 10),
  },
};

export { CODE_THEMES, type CodeThemeId };

export type LibraryThemeValues = Record<
  LibraryRadiusKey | LibraryTypeKey,
  number
> & {
  /** The hue the neutrals lean toward. */
  tint: number;
  /** The hue of the accent that drawings and links pick up. */
  accent: number;
  /** The title's typeface. */
  display: LibrarySansId;
  sans: LibrarySansId;
  mono: LibraryMonoId;
  colors: LibraryColors;
  code: CodeThemeId;
  /** The preset these values started from, which a setting's reset returns to. */
  base: LibraryPresetId;
};

export type LibraryPresetId = "assistant-ui" | "ai-ellie";

const SITE_TINT = 106;
const SITE_ACCENT = 260;

/**
 * The looks the library can wear. `assistant-ui` follows the site's design
 * rules (content/design.md): a button, input, or tab is an 8px rectangle, a
 * menu 10px, a floating panel 12px, anything printed 6px, in the site's type.
 * `ai-ellie` is the rounder look the sitemap app's token panel calls AI Ellie:
 * controls and menu rows fully round, cards and panels much rounder, neutrals
 * on a cooler hue, set in Geist a step lighter and tighter.
 */
export const LIBRARY_PRESETS: readonly {
  id: LibraryPresetId;
  label: string;
  values: LibraryThemeValues;
}[] = [
  {
    id: "assistant-ui",
    label: "assistant-ui",
    values: {
      control: 8,
      icon: 8,
      item: 6,
      surface: 10,
      floating: 12,
      card: 6,
      thumb: 6,
      titleSize: 44,
      titleWeight: 550,
      titleTracking: -10,
      titleLeading: 115,
      textSize: 17,
      textWeight: 400,
      textTracking: 0,
      textLeading: 163,
      tint: SITE_TINT,
      accent: SITE_ACCENT,
      display: "site",
      sans: "site",
      mono: "site",
      colors: SITE_COLORS,
      code: "github",
      base: "assistant-ui",
    },
  },
  {
    id: "ai-ellie",
    label: "AI Ellie",
    values: {
      control: RADIUS_FULL,
      icon: RADIUS_FULL,
      item: RADIUS_FULL,
      surface: 18,
      floating: 22,
      card: 32,
      thumb: 16,
      titleSize: 64,
      titleWeight: 450,
      titleTracking: -60,
      titleLeading: 100,
      textSize: 18,
      textWeight: 400,
      textTracking: 0,
      textLeading: 156,
      tint: 0,
      accent: SITE_ACCENT,
      display: "geist",
      sans: "geist",
      mono: "geist-mono",
      colors: SITE_COLORS,
      code: "nord",
      base: "ai-ellie",
    },
  },
];

export const DEFAULT_LIBRARY_THEME: LibraryThemeValues =
  LIBRARY_PRESETS[0]!.values;

/** The values of the preset a theme started from. */
export const baseOf = (values: LibraryThemeValues): LibraryThemeValues =>
  LIBRARY_PRESETS.find((preset) => preset.id === values.base)?.values ??
  DEFAULT_LIBRARY_THEME;

const sameColor = (a: LibraryColor, b: LibraryColor) =>
  a.l === b.l && a.c === b.c && a.a === b.a;

/** The preset these values are, or null when a person has changed one. */
export const presetOf = (
  values: LibraryThemeValues,
): LibraryPresetId | null => {
  const base = baseOf(values);
  const scalars = (Object.keys(base) as (keyof LibraryThemeValues)[]).every(
    (key) => key === "colors" || base[key] === values[key],
  );
  const colors = (["light", "dark"] as const).every((mode) =>
    LIBRARY_COLORS.every(({ key }) =>
      sameColor(base.colors[mode][key], values.colors[mode][key]),
    ),
  );
  return scalars && colors ? values.base : null;
};

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

const parseColors = (saved: unknown, d: LibraryColors): LibraryColors => {
  const modes = (saved ?? {}) as Partial<
    Record<LibraryMode, Partial<Record<string, Partial<LibraryColor>>>>
  >;
  const mode = (name: LibraryMode) =>
    Object.fromEntries(
      LIBRARY_COLORS.map(({ key }) => {
        const value = modes[name]?.[key];
        const base = d[name][key];
        return [
          key,
          {
            l: clamp(value?.l, 0, 1, base.l),
            c: clamp(value?.c, 0, 0.37, base.c),
            a: clamp(value?.a, 0, 100, base.a),
          },
        ];
      }),
    ) as Record<LibraryColorKey, LibraryColor>;
  return { light: mode("light"), dark: mode("dark") };
};

/** A saved theme read back; anything missing or malformed takes its preset's value. */
export const parseLibraryTheme = (raw: string | null): LibraryThemeValues => {
  if (!raw) return DEFAULT_LIBRARY_THEME;
  try {
    const saved = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const d =
      LIBRARY_PRESETS.find((preset) => preset.id === saved["base"])?.values ??
      DEFAULT_LIBRARY_THEME;
    const radii = Object.fromEntries(
      LIBRARY_RADII.map(({ key }) => [
        key,
        clamp(saved[key], 0, RADIUS_FULL, d[key]),
      ]),
    ) as Record<LibraryRadiusKey, number>;
    const type = Object.fromEntries(
      LIBRARY_TYPE.flatMap((group) =>
        group.settings.map(({ key, min, max }) => [
          key,
          clamp(saved[key], min, max, d[key]),
        ]),
      ),
    ) as Record<LibraryTypeKey, number>;
    return {
      ...radii,
      ...type,
      tint: clamp(saved["tint"], 0, 360, d.tint),
      accent: clamp(saved["accent"], 0, 360, d.accent),
      display:
        LIBRARY_FONTS.sans.find((font) => font.id === saved["display"])?.id ??
        d.display,
      sans:
        LIBRARY_FONTS.sans.find((font) => font.id === saved["sans"])?.id ??
        d.sans,
      mono:
        LIBRARY_FONTS.mono.find((font) => font.id === saved["mono"])?.id ??
        d.mono,
      colors: parseColors(saved["colors"], d.colors),
      code:
        typeof saved["code"] === "string" && saved["code"] in CODE_THEMES
          ? (saved["code"] as CodeThemeId)
          : d.code,
      base: d.base,
    };
  } catch {
    return DEFAULT_LIBRARY_THEME;
  }
};

/** A corner value as CSS. */
export const radiusCss = (value: number) =>
  value >= RADIUS_FULL ? "9999px" : `${value}px`;

/** A neutral as CSS, on the tint's hue. */
export const colorCss = ({ l, c, a }: LibraryColor) =>
  `oklch(${l} ${c} var(--tint)${a < 100 ? ` / ${a}%` : ""})`;

/** The variables that carry the same color as each neutral on the site. */
const COLOR_VARS: Record<LibraryColorKey, readonly string[]> = {
  background: ["--background", "--card", "--popover"],
  foreground: ["--foreground", "--card-foreground", "--popover-foreground"],
  muted: ["--muted"],
  "muted-foreground": ["--muted-foreground"],
  border: ["--border"],
};

/** A typeface as CSS: the site's own, or one the theme style names by id. */
export const fontCss = (id: LibrarySansId | LibraryMonoId, site: string) =>
  id === "site" ? site : `var(--library-font-${id})`;

/**
 * The theme as CSS for the whole document. It is mounted only by the library's
 * layout, so it applies on library routes and nowhere else, and it reaches the
 * menus, dialogs, and the saved panel, which render outside the page.
 * `families` holds the CSS font-family of each typeface that is not the site's.
 */
export const libraryThemeCss = (
  values: LibraryThemeValues,
  families: Partial<Record<LibrarySansId | LibraryMonoId, string>>,
): string => {
  const root = [
    ...LIBRARY_RADII.map(
      ({ key }) => `--library-${key}:${radiusCss(values[key])}`,
    ),
    // What sits inside a card or a row icon's frame follows its corner, less
    // the padding between them.
    "--library-card-inner:max(calc(var(--library-card) - 20px),4px)",
    "--library-thumb-inner:max(calc(var(--library-thumb) - 6px),4px)",
    `--library-title-size:${values.titleSize}px`,
    `--library-title-weight:${values.titleWeight}`,
    `--library-title-tracking:${values.titleTracking / 1000}em`,
    `--library-title-leading:${values.titleLeading / 100}`,
    `--library-text-size:${values.textSize}px`,
    `--library-text-weight:${values.textWeight}`,
    `--library-text-tracking:${values.textTracking / 1000}em`,
    `--library-text-leading:${values.textLeading / 100}`,
    ...(values.tint === SITE_TINT ? [] : [`--tint:${values.tint}`]),
    ...(values.accent === SITE_ACCENT
      ? []
      : [`--color-blue-500:oklch(0.623 0.214 ${values.accent})`]),
    // Every typeface by its id, so a preview can show one that is not in use.
    ...Object.entries(families).map(
      ([id, family]) => `--library-font-${id}:${family}`,
    ),
  ];
  const sans = families[values.sans];
  const mono = families[values.mono];
  // The site sets its font variables on the body, so the theme's go there too.
  const fonts = [
    ...(sans ? [`--font-public-sans:${sans}`] : []),
    ...(mono ? [`--font-jetbrains-mono:${mono}`] : []),
    `--library-title-font:${families[values.display] ?? "var(--font-public-sans)"}`,
  ];
  const modeCss = (mode: LibraryMode) =>
    LIBRARY_COLORS.flatMap(({ key }) => {
      const value = values.colors[mode][key];
      return sameColor(value, SITE_COLORS[mode][key])
        ? []
        : COLOR_VARS[key].map((name) => `${name}:${colorCss(value)}`);
    });
  const light = modeCss("light");
  const dark = modeCss("dark");
  return [
    `:root{${root.join(";")}}`,
    `:root body{${fonts.join(";")}}`,
    light.length > 0 ? `:root:not(.dark){${light.join(";")}}` : "",
    dark.length > 0 ? `:root.dark{${dark.join(";")}}` : "",
    ...codeThemeCss(values.code),
  ]
    .filter(Boolean)
    .join("\n");
};
