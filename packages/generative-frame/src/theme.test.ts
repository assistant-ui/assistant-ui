import { afterEach, describe, expect, it } from "vitest";
import { detectWidgetKind } from "./protocol";
import {
  DEFAULT_DARK_TOKENS,
  DEFAULT_LIGHT_TOKENS,
  detectColorScheme,
  readThemeTokens,
  THEME_TOKENS,
  toMcpAppsVariables,
} from "./theme";

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.className = "";
});

const element = (vars: Record<string, string>, className = "") => {
  const el = document.createElement("div");
  el.className = className;
  for (const [name, value] of Object.entries(vars))
    el.style.setProperty(name, value);
  document.body.appendChild(el);
  return el;
};

describe("readThemeTokens", () => {
  it("wraps bare HSL channels from older shadcn themes", () => {
    const tokens = readThemeTokens(
      element({
        "--background": "0 0% 100%",
        "--primary": "262.1 83.3% 57.8% / 90%",
        "--border": "#e5e5e5",
      }),
    );
    expect(tokens.variables["--color-background"]).toBe("hsl(0 0% 100%)");
    expect(tokens.variables["--color-accent"]).toBe(
      "hsl(262.1 83.3% 57.8% / 90%)",
    );
    expect(tokens.variables["--color-border"]).toBe("#e5e5e5");
  });

  it("maps shadcn variables onto canonical tokens", () => {
    const tokens = readThemeTokens(
      element({
        "--background": "#fff",
        "--foreground": "#111",
        "--muted-foreground": "#666",
        "--primary": "#7c3aed",
        "--primary-foreground": "#fafafa",
        "--destructive": "#e11d48",
        "--chart-1": "#0ea5e9",
        "--radius": "10px",
      }),
    );
    expect(tokens.variables).toMatchObject({
      "--color-background": "#fff",
      "--color-surface": "#fff",
      "--color-text": "#111",
      "--color-text-muted": "#666",
      "--color-accent": "#7c3aed",
      "--color-accent-text": "#fafafa",
      "--color-danger": "#e11d48",
      "--chart-1": "#0ea5e9",
      "--radius-md": "10px",
      "--radius-sm": "calc(10px - 2px)",
      "--radius-lg": "calc(10px + 4px)",
    });
  });

  it("prefers canonical names and honors custom sources", () => {
    const tokens = readThemeTokens(
      element({
        "--color-accent": "#123456",
        "--primary": "#999999",
        "--brand-success": "#00aa00",
      }),
      { "--color-success": ["--brand-success"] },
    );
    expect(tokens.variables["--color-accent"]).toBe("#123456");
    expect(tokens.variables["--color-success"]).toBe("#00aa00");
  });

  it("fills every canonical token from the defaults of the detected scheme", () => {
    const tokens = readThemeTokens(element({}, "dark"));
    expect(tokens.colorScheme).toBe("dark");
    for (const { name } of THEME_TOKENS) {
      if (name === "--font-sans") continue;
      expect(tokens.variables[name]).toBe(DEFAULT_DARK_TOKENS.variables[name]);
    }
    expect(tokens.variables["--font-sans"]).toBeTruthy();
  });
});

describe("detectColorScheme", () => {
  it("reads theme classes and attributes up the tree", () => {
    document.documentElement.className = "dark";
    expect(detectColorScheme(element({}))).toBe("dark");
    document.documentElement.className = "";
    const light = document.createElement("div");
    light.dataset["theme"] = "light";
    const inner = document.createElement("span");
    light.appendChild(inner);
    document.body.appendChild(light);
    expect(detectColorScheme(inner)).toBe("light");
  });

  it("falls back to the background color's luminance", () => {
    const el = element({});
    el.style.backgroundColor = "rgb(10, 12, 20)";
    expect(detectColorScheme(el)).toBe("dark");
    el.style.backgroundColor = "rgb(250, 250, 250)";
    expect(detectColorScheme(el)).toBe("light");
  });
});

describe("toMcpAppsVariables", () => {
  it("maps canonical tokens to MCP Apps style variables", () => {
    const vars = toMcpAppsVariables(DEFAULT_LIGHT_TOKENS);
    const v = DEFAULT_LIGHT_TOKENS.variables;
    expect(vars["--color-background-primary"]).toBe(v["--color-background"]);
    expect(vars["--color-text-primary"]).toBe(v["--color-text"]);
    expect(vars["--color-text-secondary"]).toBe(v["--color-text-muted"]);
    expect(vars["--color-border-primary"]).toBe(v["--color-border"]);
    expect(vars["--color-ring-primary"]).toBe(v["--color-accent"]);
    expect(vars["--border-radius-md"]).toBe(v["--radius-md"]);
    expect(vars["--font-mono"]).toBe(v["--font-mono"]);
    expect(vars["--color-background-danger"]).toBe(
      `color-mix(in srgb, ${v["--color-danger"]} 12%, transparent)`,
    );
  });

  it("omits variables whose source token is missing", () => {
    const vars = toMcpAppsVariables({
      colorScheme: "light",
      variables: { "--color-text": "#000" },
    });
    expect(vars["--color-text-primary"]).toBe("#000");
    expect(vars).not.toHaveProperty("--color-background-primary");
    expect(vars["--border-radius-full"]).toBe("9999px");
  });
});

describe("detectWidgetKind", () => {
  it("treats code starting with <svg as SVG", () => {
    expect(detectWidgetKind('<svg viewBox="0 0 1 1">')).toBe("svg");
    expect(detectWidgetKind('  \n<?xml version="1.0"?>\n<!-- c --><svg>')).toBe(
      "svg",
    );
    expect(detectWidgetKind("<SVG>")).toBe("svg");
    expect(detectWidgetKind("<style></style><svg>")).toBe("html");
    expect(detectWidgetKind("<svgx>")).toBe("html");
    expect(detectWidgetKind("<sv")).toBe("html");
  });
});
