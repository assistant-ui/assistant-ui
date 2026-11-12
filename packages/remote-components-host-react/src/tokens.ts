/**
 * Canonical theme tokens, compatible with generative-frame
 * (assistant-ui/packages/generative-frame/src/theme.ts, MIT).
 *
 * The host's own custom properties are tunnelled as they are (theme.ts).
 * These tokens are *added* under names that do not collide with what the
 * host defines, so a remote written against the canonical names
 * (`var(--color-text)`, …) themes correctly on any host, while components
 * using the host's own variables still see exactly the host's values.
 */
export type ColorScheme = "light" | "dark";

/** Canonical token → host variables to read it from, first match wins (shadcn/ui names after the canonical one). */
export const TOKEN_SOURCES: Readonly<Record<string, readonly string[]>> = {
  "--color-background": ["--color-background", "--background"],
  "--color-surface": ["--color-surface", "--card", "--background"],
  "--color-surface-muted": ["--color-surface-muted", "--muted", "--secondary"],
  "--color-text": ["--color-text", "--foreground"],
  "--color-text-muted": ["--color-text-muted", "--muted-foreground"],
  "--color-text-subtle": ["--color-text-subtle", "--muted-foreground"],
  "--color-border": ["--color-border", "--border"],
  "--color-border-strong": ["--color-border-strong", "--input", "--ring"],
  "--color-accent": ["--color-accent", "--primary"],
  "--color-accent-text": ["--color-accent-text", "--primary-foreground"],
  "--color-danger": ["--color-danger", "--destructive"],
  "--color-success": ["--color-success"],
  "--color-warning": ["--color-warning"],
  "--color-info": ["--color-info"],
  "--chart-1": ["--chart-1"],
  "--chart-2": ["--chart-2"],
  "--chart-3": ["--chart-3"],
  "--chart-4": ["--chart-4"],
  "--chart-5": ["--chart-5"],
  "--chart-6": ["--chart-6"],
  "--font-sans": ["--font-sans"],
  "--font-mono": ["--font-mono"],
  "--radius-sm": ["--radius-sm"],
  "--radius-md": ["--radius-md", "--radius"],
  "--radius-lg": ["--radius-lg"],
};

const SHARED: Record<string, string> = {
  "--font-sans":
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  "--font-mono":
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  "--radius-sm": "6px",
  "--radius-md": "8px",
  "--radius-lg": "12px",
};

const LIGHT: Record<string, string> = {
  ...SHARED,
  "--color-background": "#ffffff",
  "--color-surface": "#ffffff",
  "--color-surface-muted": "#f4f4f5",
  "--color-text": "#18181b",
  "--color-text-muted": "#52525b",
  "--color-text-subtle": "#71717a",
  "--color-border": "#e4e4e7",
  "--color-border-strong": "#d4d4d8",
  "--color-accent": "#2563eb",
  "--color-accent-text": "#ffffff",
  "--color-danger": "#dc2626",
  "--color-success": "#16a34a",
  "--color-warning": "#d97706",
  "--color-info": "#0284c7",
  "--chart-1": "#2563eb",
  "--chart-2": "#0d9488",
  "--chart-3": "#d97706",
  "--chart-4": "#db2777",
  "--chart-5": "#7c3aed",
  "--chart-6": "#65a30d",
};

const DARK: Record<string, string> = {
  ...SHARED,
  "--color-background": "#09090b",
  "--color-surface": "#18181b",
  "--color-surface-muted": "#27272a",
  "--color-text": "#fafafa",
  "--color-text-muted": "#a1a1aa",
  "--color-text-subtle": "#71717a",
  "--color-border": "#27272a",
  "--color-border-strong": "#3f3f46",
  "--color-accent": "#3b82f6",
  "--color-accent-text": "#ffffff",
  "--color-danger": "#f87171",
  "--color-success": "#4ade80",
  "--color-warning": "#fbbf24",
  "--color-info": "#38bdf8",
  "--chart-1": "#60a5fa",
  "--chart-2": "#2dd4bf",
  "--chart-3": "#fbbf24",
  "--chart-4": "#f472b6",
  "--chart-5": "#a78bfa",
  "--chart-6": "#a3e635",
};

/** shadcn/ui before Tailwind v4 stored colors as bare HSL channels, e.g. `222 47% 11%`. */
const HSL_CHANNELS =
  /^-?[\d.]+(?:deg)?\s+[\d.]+%\s+[\d.]+%(?:\s*\/\s*[\d.]+%?)?$/;
const RGB =
  /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/i;

/** The color scheme an element renders in (same rules as generative-frame). */
export function detectColorScheme(el: Element): ColorScheme {
  if (el.closest('.dark, [data-theme="dark"], [data-mode="dark"]'))
    return "dark";
  if (el.closest('.light, [data-theme="light"], [data-mode="light"]'))
    return "light";
  const view = el.ownerDocument.defaultView;
  const style = view?.getComputedStyle(el);
  const declared = style?.colorScheme.trim();
  if (declared === "dark" || declared === "light") return declared;
  const m = style ? RGB.exec(style.backgroundColor) : null;
  if (m && m[4] !== "0") {
    const [r, g, b] = [m[1], m[2], m[3]].map(Number) as [
      number,
      number,
      number,
    ];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? "dark" : "light";
  }
  return view?.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Canonical tokens at `el`: host values where defined, the default palette otherwise. */
export function canonicalTokens(
  el: Element,
  style: CSSStyleDeclaration,
): { colorScheme: ColorScheme; variables: Record<string, string> } {
  const colorScheme = detectColorScheme(el);
  const variables: Record<string, string> = {
    ...(colorScheme === "dark" ? DARK : LIGHT),
  };
  for (const [name, sources] of Object.entries(TOKEN_SOURCES)) {
    for (const source of sources) {
      const value = style.getPropertyValue(source).trim();
      if (value !== "") {
        variables[name] = HSL_CHANNELS.test(value) ? `hsl(${value})` : value;
        break;
      }
    }
  }
  const radius = style.getPropertyValue("--radius").trim();
  if (radius !== "" && style.getPropertyValue("--radius-sm").trim() === "")
    variables["--radius-sm"] = `calc(${radius} - 2px)`;
  if (radius !== "" && style.getPropertyValue("--radius-lg").trim() === "")
    variables["--radius-lg"] = `calc(${radius} + 4px)`;
  if (style.getPropertyValue("--font-sans").trim() === "")
    variables["--font-sans"] = style.fontFamily || variables["--font-sans"]!;
  return { colorScheme, variables };
}
