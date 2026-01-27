import { describe, it, expect } from "vitest";
import * as exports from "../index";

describe("package exports", () => {
  it("exports StreamdownTextPrimitive", () => {
    expect(exports.StreamdownTextPrimitive).toBeDefined();
  });

  it("exports useIsStreamdownCodeBlock", () => {
    expect(exports.useIsStreamdownCodeBlock).toBeDefined();
  });

  it("exports useStreamdownPreProps", () => {
    expect(exports.useStreamdownPreProps).toBeDefined();
  });

  it("exports memoCompareNodes", () => {
    expect(exports.memoCompareNodes).toBeDefined();
  });

  it("exports DEFAULT_SHIKI_THEME", () => {
    expect(exports.DEFAULT_SHIKI_THEME).toBeDefined();
    expect(exports.DEFAULT_SHIKI_THEME).toEqual([
      "github-light",
      "github-dark",
    ]);
  });

  it("re-exports parseMarkdownIntoBlocks from streamdown", () => {
    expect(exports.parseMarkdownIntoBlocks).toBeDefined();
    expect(typeof exports.parseMarkdownIntoBlocks).toBe("function");
  });

  it("re-exports StreamdownContext from streamdown", () => {
    expect(exports.StreamdownContext).toBeDefined();
  });

  it("exports all expected function exports", () => {
    const exportKeys = Object.keys(exports);
    expect(exportKeys).toContain("StreamdownTextPrimitive");
    expect(exportKeys).toContain("useIsStreamdownCodeBlock");
    expect(exportKeys).toContain("useStreamdownPreProps");
    expect(exportKeys).toContain("memoCompareNodes");
    expect(exportKeys).toContain("DEFAULT_SHIKI_THEME");
    expect(exportKeys).toContain("parseMarkdownIntoBlocks");
    expect(exportKeys).toContain("StreamdownContext");
  });
});
