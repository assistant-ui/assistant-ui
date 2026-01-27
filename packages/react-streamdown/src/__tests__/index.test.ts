import { describe, it, expect } from "vitest";
import * as exports from "../index";

describe("package exports", () => {
  it("exports StreamdownTextPrimitive", () => {
    expect(exports.StreamdownTextPrimitive).toBeDefined();
  });

  it("exports useIsStreamdownCodeBlock", () => {
    expect(exports.useIsStreamdownCodeBlock).toBeDefined();
  });

  it("exports DEFAULT_SHIKI_THEME", () => {
    expect(exports.DEFAULT_SHIKI_THEME).toBeDefined();
    expect(exports.DEFAULT_SHIKI_THEME).toEqual([
      "github-light",
      "github-dark",
    ]);
  });

  it("exports all expected types", () => {
    // Type-only exports can't be tested at runtime,
    // but we can verify the module shape
    const exportKeys = Object.keys(exports);
    expect(exportKeys).toContain("StreamdownTextPrimitive");
    expect(exportKeys).toContain("useIsStreamdownCodeBlock");
    expect(exportKeys).toContain("DEFAULT_SHIKI_THEME");
  });
});
