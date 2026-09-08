import { expect, it } from "vitest";
import {
  type BorderRadius,
  DEFAULT_CONFIG,
} from "../components/pages/playground/types";
import { generateRegistryJson } from "./playground-registry";

it.each<[BorderRadius, string]>([
  ["none", "0"],
  ["sm", "0.5rem"],
  ["md", "0.75rem"],
  ["lg", "1rem"],
  ["full", "1.5rem"],
])(
  "preserves the selected %s radius in registry themes",
  (borderRadius, radius) => {
    const config = {
      ...DEFAULT_CONFIG,
      styles: { ...DEFAULT_CONFIG.styles, borderRadius },
    };
    const registry = generateRegistryJson(config);

    expect(registry.cssVars.light["--aui-border-radius"]).toBe(radius);
    expect(registry.cssVars.dark["--aui-border-radius"]).toBe(radius);
  },
);
