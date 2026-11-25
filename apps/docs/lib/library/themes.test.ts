import { describe, expect, it } from "vitest";
import {
  LIBRARY_THEMES,
  themeApplyCommand,
  themeBuilderHref,
  themeOverridesCss,
  themePresetUrl,
  themeSummary,
  themeVars,
  type ThemeSettings,
} from "./themes";

const settings: ThemeSettings = {
  style: "nova",
  baseColor: "zinc",
  theme: "base",
  chartColor: "base",
  iconLibrary: "lucide",
  font: "geist",
  fontHeading: "inherit",
  radius: "default",
  menuAccent: "subtle",
  menuColor: "default",
};

describe("theme presets", () => {
  it("sends the base color for a theme that keeps it, and leaves out an inherited heading font", () => {
    const url = new URL(themePresetUrl(settings));

    expect(url.origin + url.pathname).toBe("https://ui.shadcn.com/init");
    expect(url.searchParams.get("theme")).toBe("zinc");
    expect(url.searchParams.get("chartColor")).toBe("zinc");
    expect(url.searchParams.has("fontHeading")).toBe(false);
  });

  it("sends an accent, chart color, and heading font when the theme sets them", () => {
    const url = new URL(
      themePresetUrl({
        ...settings,
        theme: "blue",
        chartColor: "indigo",
        fontHeading: "inter",
      }),
    );

    expect(url.searchParams.get("theme")).toBe("blue");
    expect(url.searchParams.get("chartColor")).toBe("indigo");
    expect(url.searchParams.get("fontHeading")).toBe("inter");
  });

  it("quotes a preset address in the apply command but not a name or code", () => {
    expect(themeApplyCommand("battZY")).toBe("npx shadcn@latest apply battZY");
    expect(themeApplyCommand("https://ui.shadcn.com/init?style=nova")).toBe(
      'npx shadcn@latest apply "https://ui.shadcn.com/init?style=nova"',
    );
  });

  it("opens a theme in the library's builder", () => {
    expect(themeBuilderHref("chatgpt")).toBe(
      "/library/themes/new?from=chatgpt",
    );
  });
});

describe("theme colors", () => {
  it("highlights menu rows in the primary color only for a bold menu accent", () => {
    const subtle = themeVars(settings, "light");
    const bold = themeVars({ ...settings, menuAccent: "bold" }, "light");

    expect(subtle["accent"]).not.toBe(subtle["primary"]);
    expect(bold["accent"]).toBe(bold["primary"]);
    expect(bold["accent-foreground"]).toBe(bold["primary-foreground"]);
  });

  it("lays an accent over the base color's primary", () => {
    const base = themeVars(settings, "dark");
    const blue = themeVars({ ...settings, theme: "blue" }, "dark");

    expect(blue["primary"]).not.toBe(base["primary"]);
    expect(blue["background"]).toBe(base["background"]);
  });

  it("writes overrides as light and dark rules for the global stylesheet", () => {
    expect(
      themeOverridesCss({
        light: { background: "#fff", primary: "#000" },
        dark: { background: "#000" },
      }),
    ).toBe(
      ":root { --background: #fff; --primary: #000; } .dark { --background: #000; }",
    );
  });
});

describe("theme summaries", () => {
  it("names only what differs from the defaults", () => {
    expect(themeSummary(settings)).toBe(
      "Nova style, zinc, Lucide icons, Geist.",
    );
    expect(
      themeSummary({
        ...settings,
        theme: "blue",
        chartColor: "indigo",
        fontHeading: "inter",
        radius: "large",
      }),
    ).toBe(
      "Nova style, zinc, blue accent, indigo charts, Lucide icons, Geist with Inter headings, large radius.",
    );
  });
});

describe("library themes", () => {
  it("gives every theme its own slug", () => {
    const slugs = LIBRARY_THEMES.map((theme) => theme.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
