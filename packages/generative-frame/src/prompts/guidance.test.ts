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
    expect(text).toContain("`fetch`, XHR, and WebSocket are blocked");
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

  it("documents no hidden font allowance when external origins are empty", () => {
    const text = buildWidgetGuidance({ cdnOrigins: [] });
    expect(text).toContain(
      "Shared CDN origins for external scripts, stylesheets, images, fonts, and media: none.",
    );
    expect(text).toContain(
      "When no external resource origins are configured, inline everything.",
    );
    expect(text).toContain("Extra font stylesheets load only from: nowhere.");
    expect(text).toContain("Extra font files load only from: nowhere.");
    expect(text).not.toContain("fonts.googleapis.com");
    expect(text).not.toContain("fonts.gstatic.com");
  });

  it("lists explicit font origins separately from the CDN allowance", () => {
    const text = buildWidgetGuidance({
      cdnOrigins: [],
      fontStyleOrigins: ["https://fonts.googleapis.com"],
      fontOrigins: ["https://fonts.gstatic.com"],
    });
    expect(text).toContain(
      "Extra font stylesheets load only from: https://fonts.googleapis.com.",
    );
    expect(text).toContain(
      "Extra font files load only from: https://fonts.gstatic.com.",
    );
    expect(text).toContain(
      "These origins do not allow scripts, images, or font files.",
    );
    expect(text).toContain(
      "These origins do not allow scripts, stylesheets, or images.",
    );
  });

  it("distinguishes font exceptions and embedded resources from network requests", () => {
    const text = buildWidgetGuidance({
      cdnOrigins: [],
      fontStyleOrigins: ["https://fonts.googleapis.com"],
      fontOrigins: ["https://fonts.gstatic.com"],
      connectOrigins: ["https://api.example.com"],
    });
    expect(text).toContain(
      "Shared CDN origins for external scripts, stylesheets, images, fonts, and media: none.",
    );
    expect(text).toContain(
      "The font-specific exceptions below add access only to their resource type.",
    );
    expect(text).toContain(
      "Inline scripts and styles, `data:` fonts, and `data:`/`blob:` images and media are allowed.",
    );
    expect(text).toContain(
      "External resource URLs must match the corresponding resource allowlist.",
    );
    expect(text).toContain(
      "`fetch`, XHR, and WebSocket may reach only: https://api.example.com.",
    );
    expect(text).toContain(
      "Every external resource or request uses its allowed origins; embed data when network requests are blocked.",
    );
    expect(text).not.toContain("load only from: nowhere (inline everything)");
    expect(text).not.toContain("There is no network access");
    expect(text).not.toContain("nothing depends on the network");
  });

  it("keeps network requests blocked when only font origins are configured", () => {
    const text = buildWidgetGuidance({
      cdnOrigins: [],
      fontOrigins: ["https://fonts.gstatic.com"],
    });
    expect(text).toContain(
      "Extra font files load only from: https://fonts.gstatic.com.",
    );
    expect(text).toContain("`fetch`, XHR, and WebSocket are blocked.");
    expect(text).not.toContain("There is no network access");
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
    expect(base).not.toContain("genframe.updateModelContext");

    const full = buildWidgetGuidance({
      hostApi: { prompt: false, callTool: true, modelContext: true },
    });
    expect(full).not.toContain("`sendPrompt(text)` sends");
    expect(full).toContain("genframe.callTool");
    expect(full).toContain(
      '`genframe.updateModelContext({ content: [{ type: "text", text }], structuredContent })` tells you what the user chose',
    );
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
