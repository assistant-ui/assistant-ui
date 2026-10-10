// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_CDN_ORIGINS } from "../csp";
import { DEFAULT_LIGHT_TOKENS, THEME_TOKENS } from "../theme";
import {
  buildWidgetGuidance,
  normalizeModules,
  WIDGET_MODULES,
} from "./guidance";

const headings = (text: string) =>
  text
    .split("\n")
    .filter((line) => line.startsWith("## Module: "))
    .map((line) => line.slice(11));

describe("buildWidgetGuidance", () => {
  it("is deterministic and independent of module order and duplicates", () => {
    const a = buildWidgetGuidance({ modules: ["chart", "diagram", "chart"] });
    const b = buildWidgetGuidance({ modules: ["diagram", "chart"] });
    expect(a).toBe(b);
    expect(headings(a)).toEqual(["diagram", "chart"]);
  });

  it("includes only the base rules and module index without modules", () => {
    const text = buildWidgetGuidance();
    expect(headings(text)).toEqual([]);
    for (const module of WIDGET_MODULES)
      expect(text).toContain(`\`${module}\``);
    expect(text).toContain("## Streaming order");
    expect(text).toContain("## Accessibility");
  });

  it("includes every module section when all are requested", () => {
    expect(headings(buildWidgetGuidance({ modules: WIDGET_MODULES }))).toEqual([
      ...WIDGET_MODULES,
    ]);
  });

  it("lists every canonical token by default and extra host tokens when given", () => {
    const text = buildWidgetGuidance();
    for (const { name } of THEME_TOKENS) expect(text).toContain(`\`${name}\``);

    const custom = buildWidgetGuidance({
      tokens: {
        colorScheme: "light",
        variables: {
          "--color-text": "#000",
          "--brand-gradient": "x",
          "--chart-1": "#f00",
        },
      },
    });
    expect(custom).toContain("| `--color-text` |");
    expect(custom).toContain("| `--chart-1` |");
    expect(custom).not.toContain("| `--color-accent` |");
    expect(custom).toContain("The host also defines: `--brand-gradient`.");
    expect(buildWidgetGuidance({ tokens: DEFAULT_LIGHT_TOKENS })).not.toContain(
      "The host also defines",
    );
  });

  it("reflects the CDN allowlist, network access, and eval policy", () => {
    const text = buildWidgetGuidance({ modules: ["chart"] });
    for (const origin of DEFAULT_CDN_ORIGINS) expect(text).toContain(origin);
    expect(text).toContain("There is no network access");
    expect(text).toContain(
      "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
    );
    expect(text).toContain("`eval` and `new Function` are blocked");

    const open = buildWidgetGuidance({
      cdnOrigins: ["https://unpkg.com"],
      connectOrigins: ["https://api.example.com"],
      allowEval: true,
      modules: ["chart"],
    });
    expect(open).toContain("may reach only: https://api.example.com");
    expect(open).toContain(
      "https://unpkg.com/chart.js@4.4.1/dist/chart.umd.min.js",
    );
    expect(open).not.toContain("cdn.jsdelivr.net");
    expect(open).toContain("`eval` and `new Function` are allowed");
  });

  it("adapts width and layout advice to the platform", () => {
    const desktop = buildWidgetGuidance();
    const mobile = buildWidgetGuidance({ platform: "mobile" });
    expect(desktop).toContain("about 680px wide");
    expect(desktop).toContain("## Platform: desktop");
    expect(mobile).toContain("about 360px wide");
    expect(mobile).toContain("at least 44px");
    expect(buildWidgetGuidance({ width: 520 })).toContain("about 520px wide");
  });

  it("documents only the host APIs the host offers", () => {
    const base = buildWidgetGuidance();
    expect(base).toContain("`sendPrompt(text)`");
    expect(base).not.toContain("genframe.callTool");

    const full = buildWidgetGuidance({
      hostApi: { prompt: false, callTool: true },
    });
    expect(full).not.toContain("`sendPrompt(text)` sends");
    expect(full).toContain("genframe.callTool");
  });
});

describe("normalizeModules", () => {
  it("drops unknown modules and orders the rest canonically", () => {
    expect(normalizeModules(["art", "nope", "chart", "art"])).toEqual([
      "chart",
      "art",
    ]);
  });
});
