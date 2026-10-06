import { describe, expect, it } from "vitest";
import * as full from "./full";
import * as fullImpl from "./react-syntax-highlighter-full";

describe("@assistant-ui/react-syntax-highlighter/full", () => {
  it("exports only the full makers", () => {
    expect(Object.keys(full).sort()).toEqual([
      "makePrismAsyncSyntaxHighlighter",
      "makePrismSyntaxHighlighter",
      "makeSyntaxHighlighter",
    ]);
    expect(full.makeSyntaxHighlighter).toBe(fullImpl.makeSyntaxHighlighter);
    expect(full.makePrismSyntaxHighlighter).toBe(
      fullImpl.makePrismSyntaxHighlighter,
    );
    expect(full.makePrismAsyncSyntaxHighlighter).toBe(
      fullImpl.makePrismAsyncSyntaxHighlighter,
    );
  });

  it("every maker returns a named component", () => {
    for (const make of Object.values(full)) {
      const Component = make({});
      expect(typeof Component).toBe("function");
      expect(Component.displayName).toBe("PrismSyntaxHighlighter");
    }
  });
});
