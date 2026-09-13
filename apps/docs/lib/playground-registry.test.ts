import { expect, it } from "vitest";
import {
  type BorderRadius,
  DEFAULT_CONFIG,
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
