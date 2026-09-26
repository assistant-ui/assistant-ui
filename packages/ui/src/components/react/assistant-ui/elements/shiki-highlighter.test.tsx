import { render, screen } from "@testing-library/react";
import type { ShikiHighlighterProps } from "react-shiki";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useShikiHighlighterMock } = vi.hoisted(() => ({
  useShikiHighlighterMock: vi.fn(),
}));

vi.mock("react-shiki", () => ({
  useShikiHighlighter: useShikiHighlighterMock,
}));

import { SyntaxHighlighter } from "./shiki-highlighter";

type HighlighterOptions = Omit<
  ShikiHighlighterProps,
  "children" | "language" | "theme"
>;
type LineTransformer = NonNullable<
  ShikiHighlighterProps["transformers"]
>[number];
type LineTransformerContext = ThisParameterType<
  NonNullable<LineTransformer["line"]>
>;
type HastNode = Parameters<NonNullable<LineTransformer["line"]>>[0];

const renderHighlightedCode = (options?: HighlighterOptions) => {
  const highlightedLines = new Set<number>();

  for (const transformer of options?.transformers ?? []) {
    for (const line of [1, 2, 3]) {
      const transformerContext = {
        addClassToHast: (
          _node: Parameters<LineTransformerContext["addClassToHast"]>[0],
          className: Parameters<LineTransformerContext["addClassToHast"]>[1],
        ) => {
          if (className === "highlighted") highlightedLines.add(line);
          return _node;
        },
      } as LineTransformerContext;

      transformer.line?.call(transformerContext, {} as HastNode, line);
    }
  }

  return (
    <pre>
      {["one", "two", "three"].map((text, line) => (
        <span
          className={
            highlightedLines.has(line + 1) ? "line highlighted" : "line"
          }
          key={text}
        >
          {text}
        </span>
      ))}
    </pre>
  );
};

describe("SyntaxHighlighter", () => {
  beforeEach(() => {
    useShikiHighlighterMock.mockReturnValue(null);
  });

  it("marks only the requested one-based lines after highlighting resolves", () => {
    const { rerender } = render(
      <SyntaxHighlighter
        code={"one\ntwo\nthree"}
        highlightLines={[1, 3]}
        language="text"
      />,
    );

    expect(document.querySelectorAll(".highlighted")).toHaveLength(0);

    useShikiHighlighterMock.mockImplementation(
      (
        _code: string,
        _language: unknown,
        _theme: unknown,
        options?: HighlighterOptions,
      ) => renderHighlightedCode(options),
    );
    rerender(
      <SyntaxHighlighter
        code={"one\ntwo\nthree"}
        highlightLines={[1, 3]}
        language="text"
      />,
    );

    expect(screen.getAllByText(/one|two|three/)).toHaveLength(3);
    expect(document.querySelectorAll(".highlighted")).toHaveLength(2);
    expect(document.querySelectorAll(".highlighted")[0]?.textContent).toBe(
      "one",
    );
    expect(document.querySelectorAll(".highlighted")[1]?.textContent).toBe(
      "three",
    );
  });
});
