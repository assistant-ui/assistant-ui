// The code color themes a library theme can pick, copied from the sitemap
// app's token panel (apps/sitemap/lib/tokens.ts on feat/sitemap-app). GitHub is
// the site's own, so it writes nothing.

const rule = (selector: string, decls: string[]) =>
  decls.length ? `${selector}{${decls.join("")}}` : "";

/** The roles a code theme colors, as both highlighters on the site use them. */
type CodeRoles = {
  text: string;
  comment: string;
  keyword: string;
  string: string;
  func: string;
  constant: string;
  param: string;
  tag: string;
};

export const CODE_THEMES = {
  github: { label: "GitHub" },
  ink: { label: "Ink" },
  nord: { label: "Nord" },
  warm: { label: "Warm" },
} as const;
export type CodeThemeId = keyof typeof CODE_THEMES;

/** Each theme's colors per mode; GitHub is the site's own, so it has none. */
const CODE_PALETTES: Record<
  Exclude<CodeThemeId, "github">,
  { light: CodeRoles; dark: CodeRoles }
> = (() => {
  const ink: CodeRoles = {
    text: "var(--foreground)",
    comment: "color-mix(in oklab, var(--foreground) 45%, transparent)",
    keyword: "var(--foreground)",
    string: "color-mix(in oklab, var(--foreground) 68%, transparent)",
    func: "var(--foreground)",
    constant: "color-mix(in oklab, var(--foreground) 68%, transparent)",
    param: "color-mix(in oklab, var(--foreground) 80%, transparent)",
    tag: "var(--foreground)",
  };
  return {
    ink: { light: ink, dark: ink },
    nord: {
      light: {
        text: "#2e3440",
        comment: "#7b88a1",
        keyword: "#5e81ac",
        string: "#4f7a3a",
        func: "#3b7d8c",
        constant: "#8f5e86",
        param: "#2e3440",
        tag: "#5e81ac",
      },
      dark: {
        text: "#d8dee9",
        comment: "#616e88",
        keyword: "#81a1c1",
        string: "#a3be8c",
        func: "#88c0d0",
        constant: "#b48ead",
        param: "#d8dee9",
        tag: "#81a1c1",
      },
    },
    warm: {
      light: {
        text: "#1f1c18",
        comment: "#8a847b",
        keyword: "#6b655d",
        string: "#2f7a68",
        func: "#b35c00",
        constant: "#b35c00",
        param: "#1f1c18",
        tag: "#b35c00",
      },
      dark: {
        text: "#e6e1da",
        comment: "#7c7770",
        keyword: "#a8a29a",
        string: "#9fd8c8",
        func: "#ffc799",
        constant: "#ffc799",
        param: "#e6e1da",
        tag: "#ffc799",
      },
    },
  };
})();

/** Shiki's github-light color for each role, which its tokens carry inline. */
const SHIKI_GITHUB_LIGHT: Record<keyof CodeRoles, string[]> = {
  text: ["#24292E"],
  comment: ["#6A737D"],
  keyword: ["#D73A49"],
  string: ["#032F62"],
  func: ["#6F42C1"],
  constant: ["#005CC5"],
  param: ["#E36209"],
  tag: ["#22863A"],
};

/** Code Hike's github-from-css variable for each role. */
const CODE_HIKE_VARS: Record<keyof CodeRoles, string[]> = {
  text: ["--ch-4"],
  comment: ["--ch-1"],
  keyword: ["--ch-7"],
  string: ["--ch-8", "--ch-9"],
  func: ["--ch-5"],
  constant: ["--ch-2"],
  param: ["--ch-3"],
  tag: ["--ch-6"],
};

/**
 * Shiki spans whose github-light color is `hex`. Server-rendered HTML writes
 * `--shiki-light:#hex`; React writes a client-highlighted span's style as
 * `--shiki-light: #hex`, so both spellings are matched. The rules also set the
 * span's `--shiki-light` and `--shiki-dark`, because the kit's CodeBlock colors
 * spans from those variables with a layered `!important` that an unlayered
 * `color` cannot beat.
 */
const shikiSpans = (scope: string, hex: string) =>
  `${scope} span[style*="--shiki-light:${hex}" i], ${scope} span[style*="--shiki-light: ${hex}" i]`;

/** The CSS that recolors highlighted code for a theme; empty for the site's own. */
export function codeThemeCss(theme: CodeThemeId): string[] {
  if (theme === "github") return [];
  const { light, dark } = CODE_PALETTES[theme];
  const roles = Object.keys(SHIKI_GITHUB_LIGHT) as (keyof CodeRoles)[];
  const vars = (palette: CodeRoles) =>
    roles.flatMap((role) =>
      CODE_HIKE_VARS[role].map((name) => `${name}: ${palette[role]};`),
    );
  return [
    rule(":root:not(.dark)", vars(light)),
    rule(":root.dark", vars(dark)),
    ...roles.flatMap((role) =>
      SHIKI_GITHUB_LIGHT[role].map(
        (hex) =>
          rule(shikiSpans(".shiki", hex), [
            `color: ${light[role]} !important;`,
            `--shiki-light: ${light[role]} !important;`,
          ]) +
          "\n" +
          rule(shikiSpans(":root.dark .shiki", hex), [
            `color: ${dark[role]} !important;`,
            `--shiki-dark: ${dark[role]} !important;`,
          ]),
      ),
    ),
    rule(":root:not(.dark) .shiki", [`color: ${light.text} !important;`]),
    rule(":root.dark .shiki", [`color: ${dark.text} !important;`]),
  ];
}
