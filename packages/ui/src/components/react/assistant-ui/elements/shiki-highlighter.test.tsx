import { render, screen, waitFor } from "@testing-library/react";
import type { ShikiHighlighterProps } from "react-shiki";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  actual,
  useShikiHighlighterMock,
  createHighlighterCoreMock,
  createJavaScriptRegexEngineMock,
  createOnigurumaEngineMock,
} = vi.hoisted(() => ({
  actual: {} as {
    useShikiHighlighter?: typeof import("react-shiki/core").useShikiHighlighter;
  },
  useShikiHighlighterMock: vi.fn(),
  createHighlighterCoreMock: vi.fn(),
  createJavaScriptRegexEngineMock: vi.fn(),
  createOnigurumaEngineMock: vi.fn(),
}));

vi.mock("react-shiki/core", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-shiki/core")>();
  actual.useShikiHighlighter = mod.useShikiHighlighter;
  return { ...mod, useShikiHighlighter: useShikiHighlighterMock };
});

vi.mock("shiki/core", async (importOriginal) => {
  const mod = await importOriginal<typeof import("shiki/core")>();
  createHighlighterCoreMock.mockImplementation(mod.createHighlighterCore);
  return { ...mod, createHighlighterCore: createHighlighterCoreMock };
});

vi.mock("shiki/engine/javascript", async (importOriginal) => {
  const mod = await importOriginal<typeof import("shiki/engine/javascript")>();
  createJavaScriptRegexEngineMock.mockImplementation(
    mod.createJavaScriptRegexEngine,
  );
  return {
    ...mod,
    createJavaScriptRegexEngine: createJavaScriptRegexEngineMock,
  };
});

vi.mock("shiki/engine/oniguruma", async (importOriginal) => {
  const mod = await importOriginal<typeof import("shiki/engine/oniguruma")>();
  createOnigurumaEngineMock.mockImplementation(mod.createOnigurumaEngine);
  return { ...mod, createOnigurumaEngine: createOnigurumaEngineMock };
});

import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
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
    useShikiHighlighterMock.mockImplementation(actual.useShikiHighlighter!);
  });

  it("highlights with the JavaScript engine by default, without WebAssembly", async () => {
    const { container } = render(
      <SyntaxHighlighter code="const answer = 42;" language="ts" delay={0} />,
    );

    await waitFor(() =>
      expect(container.querySelector("pre.shiki span[style]")).toBeTruthy(),
    );
    expect(createJavaScriptRegexEngineMock).toHaveBeenCalled();
    expect(createOnigurumaEngineMock).not.toHaveBeenCalled();
  });

  it("honors an explicitly passed engine", async () => {
    const engine = createJavaScriptRegexEngine();
    const { container } = render(
      <SyntaxHighlighter
        code="const answer = 42;"
        language="ts"
        delay={0}
        engine={engine}
      />,
    );

    await waitFor(() =>
      expect(container.querySelector("pre.shiki span[style]")).toBeTruthy(),
    );
    expect(createHighlighterCoreMock).toHaveBeenCalledWith({ engine });
  });

  it("marks only the requested one-based lines after highlighting resolves", async () => {
    useShikiHighlighterMock.mockReturnValue(null);
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

    await waitFor(() =>
      expect(document.querySelectorAll(".highlighted")).toHaveLength(2),
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
