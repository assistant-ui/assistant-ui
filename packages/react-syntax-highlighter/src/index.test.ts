import { describe, expect, it } from "vitest";
import * as index from "./index";
import * as light from "./react-syntax-highlighter-light";

describe("@assistant-ui/react-syntax-highlighter", () => {
  it("exports only the light makers", () => {
    expect(Object.keys(index).sort()).toEqual([
      "makeLightAsyncSyntaxHighlighter",
      "makeLightSyntaxHighlighter",
      "makePrismAsyncLightSyntaxHighlighter",
      "makePrismLightSyntaxHighlighter",
    ]);
    expect(index.makeLightSyntaxHighlighter).toBe(
      light.makeLightSyntaxHighlighter,
    );
    expect(index.makeLightAsyncSyntaxHighlighter).toBe(
      light.makeLightAsyncSyntaxHighlighter,
    );
    expect(index.makePrismLightSyntaxHighlighter).toBe(
      light.makePrismLightSyntaxHighlighter,
    );
    expect(index.makePrismAsyncLightSyntaxHighlighter).toBe(
      light.makePrismAsyncLightSyntaxHighlighter,
    );
  });

  it("every maker returns a named component", () => {
    for (const make of Object.values(index)) {
      const Component = make({});
      expect(typeof Component).toBe("function");
      expect(Component.displayName).toBe("PrismSyntaxHighlighter");
    }
  });
});
