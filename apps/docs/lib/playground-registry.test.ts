import { expect, it } from "vitest";
import {
  type BorderRadius,
  DEFAULT_CONFIG,
  DEFAULT_COLORS,
  type FontSize,
} from "../components/pages/playground/types";
import { generateRegistryJson } from "./playground-registry";
import { decodeConfig } from "./playground-url-state";

it.each<{ fontSize: FontSize; className: string }>([
  { fontSize: "13px", className: "text-[13px]" },
  { fontSize: "14px", className: "text-sm" },
  { fontSize: "15px", className: "text-[15px]" },
  { fontSize: "16px", className: "text-base" },
])("preserves $fontSize in the installed thread", ({ fontSize, className }) => {
  const config = {
    ...DEFAULT_CONFIG,
    styles: { ...DEFAULT_CONFIG.styles, fontSize },
  };
  const registry = generateRegistryJson(config);

  expect(registry.files[0]?.content).toContain(`bg-background ${className}"`);
});

it("preserves the default font size in the installed thread", () => {
  const registry = generateRegistryJson(DEFAULT_CONFIG);

  expect(registry.files[0]?.content).toContain('bg-background text-sm"');
});

it("uses the fallback for an unknown font size in decoded configuration", () => {
  const encoded = Buffer.from(
    JSON.stringify({ styles: { fontSize: "18px" } }),
  ).toString("base64url");
  const registry = generateRegistryJson(decodeConfig(encoded));

  expect(registry.files[0]?.content).toContain('bg-background text-base"');
});

it.each<[BorderRadius, string]>([
  ["none", "0"],
  ["sm", "0.5rem"],
  ["md", "0.75rem"],
  ["lg", "1rem"],
  ["full", "1.5rem"],
])(
  "preserves the selected %s radius in registry themes and composer",
  (borderRadius, radius) => {
    const config = {
      ...DEFAULT_CONFIG,
      styles: { ...DEFAULT_CONFIG.styles, borderRadius },
    };
    const registry = generateRegistryJson(config);

    expect(registry.cssVars.light["--aui-border-radius"]).toBe(radius);
    expect(registry.cssVars.dark["--aui-border-radius"]).toBe(radius);
    expect(registry.files[0]?.content).toContain(
      `"--composer-radius": "${radius}"`,
    );
  },
);

it("preserves the fallback radius for unknown decoded values", () => {
  const config = decodeConfig(
    Buffer.from(JSON.stringify({ styles: { borderRadius: "xl" } })).toString(
      "base64url",
    ),
  );
  const registry = generateRegistryJson(config);

  expect(registry.cssVars.light["--aui-border-radius"]).toBe("0.5rem");
  expect(registry.cssVars.dark["--aui-border-radius"]).toBe("0.5rem");
  expect(registry.files[0]?.content).toContain('"--composer-radius": "0.5rem"');
});

it("keeps configured colors in registry variables and generated markup", () => {
  const config = {
    ...DEFAULT_CONFIG,
    styles: {
      ...DEFAULT_CONFIG.styles,
      colors: {
        ...DEFAULT_CONFIG.styles.colors,
        background: { light: "#101010", dark: "#202020" },
        foreground: { light: "#f1f1f1", dark: "#e2e2e2" },
        border: { light: "#303030", dark: "#404040" },
        userMessage: { light: "#505050", dark: "#606060" },
        composer: { light: "#707070", dark: "#808080" },
        suggestion: { light: "#909090", dark: "#a0a0a0" },
        suggestionBorder: { light: "#b0b0b0", dark: "#c0c0c0" },
      },
    },
  };
  const registry = generateRegistryJson(config);
  const content = registry.files[0]?.content ?? "";

  expect(registry.cssVars.light["--aui-background"]).toBe("#101010");
  expect(registry.cssVars.dark["--aui-background"]).toBe("#202020");
  expect(registry.cssVars.light["--aui-composer"]).toBe("#707070");
  expect(registry.cssVars.dark["--aui-suggestion"]).toBe("#a0a0a0");
  expect(content).toContain('"--color-background": "var(--aui-background)"');
  expect(content).toContain("bg-(--aui-suggestion-fill)");
  expect(content).toContain("bg-[var(--aui-user-message)]");
  expect(content).toContain('"--composer-bg": "var(--aui-composer)"');
});

it("uses kit defaults when optional colors are unset", () => {
  const registry = generateRegistryJson(DEFAULT_CONFIG);
  const content = registry.files[0]?.content ?? "";

  expect(registry.cssVars.light["--aui-background"]).toBe(
    DEFAULT_COLORS.background.light,
  );
  expect(registry.cssVars.dark["--aui-user-message"]).toBe(
    DEFAULT_COLORS.userMessage.dark,
  );
  expect(registry.cssVars.light["--aui-composer"]).toBe(
    "color-mix(in oklab, var(--aui-muted) 30%, transparent)",
  );
  expect(registry.cssVars.light["--aui-suggestion-fill"]).toBe("transparent");
  expect(content).toContain('"--composer-bg": "var(--aui-composer)"');
});
