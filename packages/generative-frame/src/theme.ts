import type { ColorScheme } from "./protocol";

/** Theme values sent into a widget frame, keyed by CSS custom property name. */
export type ThemeTokens = {
  colorScheme: ColorScheme;
  variables: Record<string, string>;
};

export type ThemeTokenName =
  | "--color-background"
  | "--color-surface"
  | "--color-surface-muted"
  | "--color-text"
  | "--color-text-muted"
  | "--color-text-subtle"
  | "--color-border"
  | "--color-border-strong"
  | "--color-accent"
  | "--color-accent-text"
  | "--color-danger"
  | "--color-success"
  | "--color-warning"
  | "--color-info"
  | "--chart-1"
  | "--chart-2"
  | "--chart-3"
  | "--chart-4"
  | "--chart-5"
  | "--chart-6"
  | "--font-sans"
  | "--font-mono"
  | "--radius-sm"
  | "--radius-md"
  | "--radius-lg";

export type ThemeTokenInfo = {
  name: ThemeTokenName;
  group:
    | "surface"
    | "text"
    | "border"
    | "accent"
    | "status"
    | "chart"
    | "type"
    | "shape";
  usage: string;
};

/** The canonical tokens every frame defines, in prompt order. */
export const THEME_TOKENS: readonly ThemeTokenInfo[] = [
  {
    name: "--color-background",
    group: "surface",
    usage:
      "the host page behind the widget; for knockouts only, the widget itself stays transparent",
  },
  {
    name: "--color-surface",
    group: "surface",
    usage: "cards, panels, popovers",
  },
  {
    name: "--color-surface-muted",
    group: "surface",
    usage: "wells, table stripes, hover fills, code blocks",
  },
  {
    name: "--color-text",
    group: "text",
    usage: "body text, headings, primary values",
  },
  {
    name: "--color-text-muted",
    group: "text",
    usage: "labels, secondary text, axis titles",
  },
  {
    name: "--color-text-subtle",
    group: "text",
    usage: "captions, tick labels, placeholders, disabled",
  },
  {
    name: "--color-border",
    group: "border",
    usage: "hairlines, dividers, card outlines, gridlines",
  },
  {
    name: "--color-border-strong",
    group: "border",
    usage: "inputs, emphasized outlines, focus-adjacent edges",
  },
  {
    name: "--color-accent",
    group: "accent",
    usage: "primary actions, selection, the one highlighted series",
  },
  {
    name: "--color-accent-text",
    group: "accent",
    usage: "text and icons placed on --color-accent",
  },
  {
    name: "--color-danger",
    group: "status",
    usage: "errors, destructive actions, negative deltas",
  },
  {
    name: "--color-success",
    group: "status",
    usage: "success, positive deltas",
  },
  {
    name: "--color-warning",
    group: "status",
    usage: "warnings, pending states",
  },
  {
    name: "--color-info",
    group: "status",
    usage: "neutral notices, links inside callouts",
  },
  { name: "--chart-1", group: "chart", usage: "first categorical series" },
  { name: "--chart-2", group: "chart", usage: "second categorical series" },
  { name: "--chart-3", group: "chart", usage: "third categorical series" },
  { name: "--chart-4", group: "chart", usage: "fourth categorical series" },
  { name: "--chart-5", group: "chart", usage: "fifth categorical series" },
  { name: "--chart-6", group: "chart", usage: "sixth categorical series" },
  { name: "--font-sans", group: "type", usage: "all UI text" },
  { name: "--font-mono", group: "type", usage: "code, tabular identifiers" },
  {
    name: "--radius-sm",
    group: "shape",
    usage: "chips, inputs, small buttons",
  },
  { name: "--radius-md", group: "shape", usage: "buttons, cards" },
  { name: "--radius-lg", group: "shape", usage: "large panels, dialogs" },
];

const SHARED: Partial<Record<ThemeTokenName, string>> = {
  "--font-sans":
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  "--font-mono":
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  "--radius-sm": "6px",
  "--radius-md": "8px",
  "--radius-lg": "12px",
};

export const DEFAULT_LIGHT_TOKENS: ThemeTokens = {
  colorScheme: "light",
  variables: {
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
  } as Record<string, string>,
};

export const DEFAULT_DARK_TOKENS: ThemeTokens = {
  colorScheme: "dark",
  variables: {
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
  } as Record<string, string>,
};

export const defaultThemeTokens = (scheme: ColorScheme): ThemeTokens =>
  scheme === "dark" ? DEFAULT_DARK_TOKENS : DEFAULT_LIGHT_TOKENS;

/**
 * Where `readThemeTokens` looks for each canonical token, first match wins.
 * The defaults read the canonical name, then the shadcn/ui variable.
 */
export type ThemeTokenSources = Partial<
  Record<ThemeTokenName, string | readonly string[]>
>;

export const DEFAULT_TOKEN_SOURCES: Record<ThemeTokenName, readonly string[]> =
  {
    "--color-background": ["--color-background", "--background"],
    "--color-surface": ["--color-surface", "--card", "--background"],
    "--color-surface-muted": [
      "--color-surface-muted",
      "--muted",
      "--secondary",
    ],
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

/** shadcn/ui before Tailwind v4 stored colors as bare HSL channels, e.g. `222 47% 11%`. */
const HSL_CHANNELS =
  /^-?[\d.]+(?:deg)?\s+[\d.]+%\s+[\d.]+%(?:\s*\/\s*[\d.]+%?)?$/;

const RGB =
  /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/i;

const schemeFromColor = (color: string): ColorScheme | undefined => {
  const match = RGB.exec(color);
  if (!match || match[4] === "0") return undefined;
  const [r, g, b] = [match[1], match[2], match[3]].map(Number) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? "dark" : "light";
};

/** Infers the color scheme an element renders in. */
export function detectColorScheme(element: Element): ColorScheme {
  if (element.closest('.dark, [data-theme="dark"], [data-mode="dark"]')) {
    return "dark";
  }
  if (element.closest('.light, [data-theme="light"], [data-mode="light"]')) {
    return "light";
  }
  const view = element.ownerDocument.defaultView;
  const style = view?.getComputedStyle(element);
  const declared = style?.colorScheme.trim();
  if (declared === "dark" || declared === "light") return declared;
  const fromBackground = style && schemeFromColor(style.backgroundColor);
  if (fromBackground) return fromBackground;
  return view?.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Reads the host page's theme into canonical tokens. Tokens the page does not
 * define fall back to the built-in palette for the detected color scheme.
 */
export function readThemeTokens(
  element: Element = document.documentElement,
  sources: ThemeTokenSources = {},
): ThemeTokens {
  const colorScheme = detectColorScheme(element);
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const variables: Record<string, string> = {
    ...defaultThemeTokens(colorScheme).variables,
  };
  if (!style) return { colorScheme, variables };

  for (const info of THEME_TOKENS) {
    const override = sources[info.name];
    const candidates =
      override === undefined
        ? DEFAULT_TOKEN_SOURCES[info.name]
        : typeof override === "string"
          ? [override]
          : override;
    for (const candidate of candidates) {
      const value = style.getPropertyValue(candidate).trim();
      if (value) {
        variables[info.name] = HSL_CHANNELS.test(value)
          ? `hsl(${value})`
          : value;
        break;
      }
    }
  }

  const radius = style.getPropertyValue("--radius").trim();
  if (radius && !style.getPropertyValue("--radius-sm").trim()) {
    variables["--radius-sm"] = `calc(${radius} - 2px)`;
  }
  if (radius && !style.getPropertyValue("--radius-lg").trim()) {
    variables["--radius-lg"] = `calc(${radius} + 4px)`;
  }
  if (!style.getPropertyValue("--font-sans").trim()) {
    const doc = element.ownerDocument;
    const fontElement =
      element === doc.documentElement && doc.body ? doc.body : element;
    const family = doc.defaultView?.getComputedStyle(fontElement).fontFamily;
    if (family) variables["--font-sans"] = family;
  }

  return { colorScheme, variables };
}

const tint = (color: string | undefined, percent: number) =>
  color ? `color-mix(in srgb, ${color} ${percent}%, transparent)` : undefined;

/**
 * Maps canonical tokens onto the MCP Apps standard style variables, so
 * widgets written for MCP Apps hosts pick up the host theme too.
 */
export function toMcpAppsVariables(
  tokens: ThemeTokens,
): Record<string, string> {
  const v = tokens.variables;
  const entries: [string, string | undefined][] = [
    ["--color-background-primary", v["--color-background"]],
    ["--color-background-secondary", v["--color-surface"]],
    ["--color-background-tertiary", v["--color-surface-muted"]],
    ["--color-background-inverse", v["--color-text"]],
    ["--color-background-ghost", "transparent"],
    ["--color-background-info", tint(v["--color-info"], 12)],
    ["--color-background-danger", tint(v["--color-danger"], 12)],
    ["--color-background-success", tint(v["--color-success"], 12)],
    ["--color-background-warning", tint(v["--color-warning"], 12)],
    ["--color-background-disabled", v["--color-surface-muted"]],
    ["--color-text-primary", v["--color-text"]],
    ["--color-text-secondary", v["--color-text-muted"]],
    ["--color-text-tertiary", v["--color-text-subtle"]],
    ["--color-text-inverse", v["--color-background"]],
    ["--color-text-ghost", v["--color-text-subtle"]],
    ["--color-text-info", v["--color-info"]],
    ["--color-text-danger", v["--color-danger"]],
    ["--color-text-success", v["--color-success"]],
    ["--color-text-warning", v["--color-warning"]],
    ["--color-text-disabled", v["--color-text-subtle"]],
    ["--color-border-primary", v["--color-border"]],
    ["--color-border-secondary", v["--color-border-strong"]],
    ["--color-border-tertiary", v["--color-border"]],
    ["--color-border-inverse", v["--color-text"]],
    ["--color-border-ghost", "transparent"],
    ["--color-border-info", v["--color-info"]],
    ["--color-border-danger", v["--color-danger"]],
    ["--color-border-success", v["--color-success"]],
    ["--color-border-warning", v["--color-warning"]],
    ["--color-border-disabled", v["--color-border"]],
    ["--color-ring-primary", v["--color-accent"]],
    ["--color-ring-secondary", v["--color-border-strong"]],
    ["--color-ring-inverse", v["--color-background"]],
    ["--color-ring-info", v["--color-info"]],
    ["--color-ring-danger", v["--color-danger"]],
    ["--color-ring-success", v["--color-success"]],
    ["--color-ring-warning", v["--color-warning"]],
    ["--font-sans", v["--font-sans"]],
    ["--font-mono", v["--font-mono"]],
    ["--font-weight-normal", "400"],
    ["--font-weight-medium", "500"],
    ["--font-weight-semibold", "600"],
    ["--font-weight-bold", "700"],
    ["--font-text-xs-size", "12px"],
    ["--font-text-sm-size", "14px"],
    ["--font-text-md-size", "16px"],
    ["--font-text-lg-size", "18px"],
    ["--font-heading-sm-size", "18px"],
    ["--font-heading-md-size", "22px"],
    ["--font-heading-lg-size", "28px"],
    ["--border-radius-xs", v["--radius-sm"]],
    ["--border-radius-sm", v["--radius-sm"]],
    ["--border-radius-md", v["--radius-md"]],
    ["--border-radius-lg", v["--radius-lg"]],
    ["--border-radius-xl", v["--radius-lg"]],
    ["--border-radius-full", "9999px"],
    ["--border-width-regular", "1px"],
  ];
  const result: Record<string, string> = {};
  for (const [name, value] of entries) {
    if (value !== undefined) result[name] = value;
  }
  return result;
}

/** Every variable a frame receives: canonical tokens plus their MCP Apps aliases. */
export function themeVariables(tokens: ThemeTokens): Record<string, string> {
  return { ...toMcpAppsVariables(tokens), ...tokens.variables };
}
