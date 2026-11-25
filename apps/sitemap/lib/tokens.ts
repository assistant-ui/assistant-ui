/*
 * The design tokens the token panel edits, with the docs site's values as
 * defaults (apps/docs/styles/globals.css, animate.css, and the /design page).
 * `tokenCss` writes only what differs from those defaults.
 */

export const RADII = [
  { key: "page", note: "The page and full-bleed bands" },
  { key: "document", note: "Printed matter: code, tables, plates" },
  { key: "sm", note: "Kbd, inline code, small icon buttons" },
  { key: "control", note: "Buttons, inputs, CTAs" },
  { key: "surface", note: "Menus, popovers, tooltips" },
  { key: "xl", note: "Dialogs, toasts, floating cards" },
  { key: "thread", note: "Composer and user bubble" },
  { key: "capsule", note: "Switches, avatars, status dots" },
] as const;
export type RadiusKey = (typeof RADII)[number]["key"];

/** The capsule radius at its slider's end means fully round. */
export const RADIUS_FULL = 40;

export const COLORS = [
  { key: "background", label: "Background", hue: "tint" },
  { key: "foreground", label: "Foreground", hue: "tint" },
  { key: "muted", label: "Muted", hue: "tint" },
  { key: "muted-foreground", label: "Muted foreground", hue: "tint" },
  { key: "border", label: "Border", hue: "tint", alpha: true },
  { key: "destructive", label: "Destructive", hue: "own" },
] as const;
export type ColorKey = (typeof COLORS)[number]["key"];

export type Oklch = { l: number; c: number; h: number; a: number };

export const FONT_CHOICES = {
  sans: [
    "Public Sans",
    "Inter",
    "Geist",
    "IBM Plex Sans",
    "Instrument Sans",
    "DM Sans",
    "Manrope",
    "Space Grotesk",
    "Figtree",
  ],
  mono: [
    "JetBrains Mono",
    "Geist Mono",
    "IBM Plex Mono",
    "Fira Code",
    "Space Mono",
    "DM Mono",
  ],
} as const;

export const VOICES = [
  { key: "display", label: "Display", kind: "sans" },
  { key: "sans", label: "Sans", kind: "sans" },
  { key: "mono", label: "Mono", kind: "mono" },
] as const;
export type VoiceKey = (typeof VOICES)[number]["key"];

export const TYPES = [
  { key: "hero", label: "typeHero", breakpoint: "lg" },
  { key: "page", label: "typePage", breakpoint: "md" },
  { key: "section", label: "typeSection", breakpoint: "lg" },
  { key: "deck", label: "typeDeck", breakpoint: null },
  { key: "package", label: "typePackage", breakpoint: "lg" },
] as const;
export type TypeKey = (typeof TYPES)[number]["key"];

/** Sizes in px, leading as a ratio, tracking in em. */
export type TypeStyle = {
  size: number;
  sizeLg: number;
  leading: number;
  weight: number;
  tracking: number;
};

export type Tokens = {
  radius: Record<RadiusKey, number>;
  tint: number;
  colors: Record<"light" | "dark", Record<ColorKey, Oklch>>;
  blue: Oklch;
  glint: Oklch;
  fonts: Record<VoiceKey, string>;
  trackingHero: number;
  trackingSection: number;
  type: Record<TypeKey, TypeStyle>;
  motion: { word: number; rise: number; glint: number };
};

const tint = (l: number, c: number, a = 100): Oklch => ({ l, c, h: -1, a });

/** A hue of -1 follows `--tint`. */
export const DEFAULT_TOKENS: Tokens = {
  radius: {
    page: 0,
    document: 6,
    sm: 6,
    control: 8,
    surface: 10,
    xl: 12,
    thread: 16,
    capsule: RADIUS_FULL,
  },
  tint: 106,
  colors: {
    light: {
      background: tint(0.992, 0.002),
      foreground: tint(0.145, 0.006),
      muted: tint(0.97, 0.004),
      "muted-foreground": tint(0.556, 0.007),
      border: tint(0.145, 0.006, 10),
      destructive: { l: 0.577, c: 0.245, h: 27.325, a: 100 },
    },
    dark: {
      background: tint(0.17, 0.003),
      foreground: tint(0.985, 0.002),
      muted: tint(0.275, 0.004),
      "muted-foreground": tint(0.708, 0.004),
      border: tint(0.985, 0.002, 10),
      destructive: { l: 0.704, c: 0.191, h: 22.216, a: 100 },
    },
  },
  blue: { l: 0.623, c: 0.214, h: 259.815, a: 100 },
  glint: { l: 0.82, c: 0.14, h: 82, a: 85 },
  fonts: {
    display: "Public Sans",
    sans: "Public Sans",
    mono: "JetBrains Mono",
  },
  trackingHero: -0.015,
  trackingSection: -0.01,
  type: {
    hero: {
      size: 44,
      sizeLg: 72,
      leading: 1.04,
      weight: 500,
      tracking: -0.015,
    },
    page: { size: 30, sizeLg: 36, leading: 1.2, weight: 550, tracking: -0.01 },
    section: {
      size: 24,
      sizeLg: 28,
      leading: 1.375,
      weight: 550,
      tracking: -0.01,
    },
    deck: { size: 15, sizeLg: 15, leading: 1.625, weight: 400, tracking: 0 },
    package: {
      size: 24,
      sizeLg: 28,
      leading: 1.375,
      weight: 500,
      tracking: -0.01,
    },
  },
  motion: { word: 0.5, rise: 0.6, glint: 7 },
};

/** The next/font families the docs site already loads, by family name. */
const LOADED_FONTS: Record<string, string> = {
  "Public Sans": "var(--font-public-sans)",
  "JetBrains Mono": "var(--font-jetbrains-mono)",
};

export const fontStack = (family: string, kind: "sans" | "mono") =>
  LOADED_FONTS[family] ??
  `"${family}", ${kind === "mono" ? "ui-monospace, monospace" : "ui-sans-serif, sans-serif"}`;

/** Google Fonts stylesheet for a family the site does not already load. */
export const fontHref = (family: string) =>
  LOADED_FONTS[family]
    ? null
    : `https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:wght@300;400;500;600;700&display=swap`;

const round = (value: number, places: number) =>
  Number(value.toFixed(places)).toString();

export const oklch = ({ l, c, h, a }: Oklch) =>
  `oklch(${round(l, 3)} ${round(c, 3)} ${h < 0 ? "var(--tint)" : round(h, 3)}${a < 100 ? ` / ${round(a, 1)}%` : ""})`;

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

const rule = (selector: string, decls: string[]) =>
  decls.length
    ? `${selector} {\n${decls.map((d) => `  ${d}`).join("\n")}\n}`
    : "";

/** CSS for every token that differs from the docs site's value. */
export function tokenCss(tokens: Tokens): string {
  const d = DEFAULT_TOKENS;
  const root: string[] = [];
  const light: string[] = [];
  const dark: string[] = [];
  const extra: string[] = [];

  for (const { key } of RADII) {
    const value = tokens.radius[key];
    if (value === d.radius[key]) continue;
    const css =
      key === "capsule" && value >= RADIUS_FULL ? "9999px" : `${value}px`;
    root.push(`--radius-${key}: ${css};`);
  }
  if (tokens.tint !== d.tint) root.push(`--tint: ${round(tokens.tint, 1)};`);

  for (const mode of ["light", "dark"] as const) {
    for (const { key } of COLORS) {
      const value = tokens.colors[mode][key];
      if (same(value, d.colors[mode][key])) continue;
      (mode === "light" ? light : dark).push(`--${key}: ${oklch(value)};`);
    }
  }
  if (!same(tokens.blue, d.blue))
    root.push(`--color-blue-500: ${oklch(tokens.blue)};`);

  for (const { key, kind } of VOICES) {
    if (tokens.fonts[key] === d.fonts[key]) continue;
    root.push(`--font-${key}: ${fontStack(tokens.fonts[key], kind)};`);
  }
  if (tokens.trackingHero !== d.trackingHero)
    root.push(`--tracking-hero: ${round(tokens.trackingHero, 4)}em;`);
  if (tokens.trackingSection !== d.trackingSection)
    root.push(`--tracking-section: ${round(tokens.trackingSection, 4)}em;`);

  for (const { key } of TYPES) {
    const t = tokens.type[key];
    const base = d.type[key];
    if (t.size !== base.size) root.push(`--type-${key}-size: ${t.size}px;`);
    if (t.sizeLg !== base.sizeLg)
      root.push(`--type-${key}-size-lg: ${t.sizeLg}px;`);
    if (t.leading !== base.leading)
      root.push(`--type-${key}-leading: ${round(t.leading, 3)};`);
    if (t.weight !== base.weight)
      root.push(`--type-${key}-weight: ${t.weight};`);
    if (t.tracking !== base.tracking)
      root.push(`--type-${key}-tracking: ${round(t.tracking, 4)}em;`);
  }

  if (!same(tokens.glint, d.glint)) {
    extra.push(
      rule(".hero-glint", [
        `background: linear-gradient(100deg, transparent 32%, ${oklch(tokens.glint)} 50%, transparent 68%);`,
      ]),
    );
  }
  const { word, rise, glint } = tokens.motion;
  if (word !== d.motion.word)
    extra.push(
      rule(".hero-word", [`animation-duration: ${word}s;`]),
      rule(".hero-word-ink", [`animation-duration: ${round(word * 1.4, 2)}s;`]),
    );
  if (rise !== d.motion.rise)
    extra.push(rule(".hero-rise", [`animation-duration: ${rise}s;`]));
  if (glint !== d.motion.glint)
    extra.push(rule(".hero-glint", [`animation-duration: ${glint}s;`]));

  return [
    rule(":root", root),
    rule(":root:not(.dark)", light),
    rule(":root.dark", dark),
    ...extra,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Saved tokens merged over the defaults, so a token added later keeps its default. */
export function parseTokens(raw: string | null): Tokens {
  if (!raw) return DEFAULT_TOKENS;
  try {
    const saved = JSON.parse(raw) as Partial<Tokens>;
    return {
      ...DEFAULT_TOKENS,
      ...saved,
      radius: { ...DEFAULT_TOKENS.radius, ...saved.radius },
      colors: {
        light: { ...DEFAULT_TOKENS.colors.light, ...saved.colors?.light },
        dark: { ...DEFAULT_TOKENS.colors.dark, ...saved.colors?.dark },
      },
      fonts: { ...DEFAULT_TOKENS.fonts, ...saved.fonts },
      type: { ...DEFAULT_TOKENS.type, ...saved.type },
      motion: { ...DEFAULT_TOKENS.motion, ...saved.motion },
    };
  } catch {
    return DEFAULT_TOKENS;
  }
}
