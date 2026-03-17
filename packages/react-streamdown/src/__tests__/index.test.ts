import { describe, it, expect } from "vitest";
import {
  StreamdownTextPrimitive,
  useIsStreamdownCodeBlock,
  useStreamdownPreProps,
  memoCompareNodes,
  DEFAULT_SHIKI_THEME,
  parseMarkdownIntoBlocks,
  StreamdownContext,
} from "../index";

describe("package exports", () => {
  it("exports StreamdownTextPrimitive", () => {
    expect(StreamdownTextPrimitive).toBeDefined();
  });

  it("exports useIsStreamdownCodeBlock", () => {
    expect(useIsStreamdownCodeBlock).toBeDefined();
  });

  it("exports useStreamdownPreProps", () => {
    expect(useStreamdownPreProps).toBeDefined();
  });

  it("exports memoCompareNodes", () => {
    expect(memoCompareNodes).toBeDefined();
  });

  it("exports DEFAULT_SHIKI_THEME with correct values", () => {
    expect(DEFAULT_SHIKI_THEME).toEqual(["github-light", "github-dark"]);
  });

  it("exports parseMarkdownIntoBlocks as a function", () => {
    expect(typeof parseMarkdownIntoBlocks).toBe("function");
  });

  it("exports StreamdownContext", () => {
    expect(StreamdownContext).toBeDefined();
  });
});
