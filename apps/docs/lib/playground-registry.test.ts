import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  type FontSize,
} from "../components/pages/playground/types";
import { generateRegistryJson } from "./playground-registry";

describe("generateRegistryJson", () => {
  it.each<{ fontSize: FontSize; className: string }>([
    { fontSize: "13px", className: "text-[13px]" },
    { fontSize: "14px", className: "text-sm" },
    { fontSize: "15px", className: "text-[15px]" },
    { fontSize: "16px", className: "text-base" },
  ])(
    "preserves $fontSize in the installed thread",
    ({ fontSize, className }) => {
      const config = {
        ...DEFAULT_CONFIG,
        styles: { ...DEFAULT_CONFIG.styles, fontSize },
      };
      const registry = generateRegistryJson(config);

      expect(registry.files[0]?.content).toContain(
        `bg-background ${className}"`,
      );
    },
  );
});
