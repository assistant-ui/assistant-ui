import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { createElement } from "react";
import { useAdaptedComponents } from "../adapters/components-adapter";
import type { StreamdownTextComponents } from "../types";

afterEach(cleanup);

describe("useAdaptedComponents", () => {
  describe("basic behavior", () => {
    it("returns PreOverride when no components provided", () => {
      const { result } = renderHook(() => useAdaptedComponents({}));
      expect(result.current).toHaveProperty("pre");
      expect(result.current).not.toHaveProperty("code");
    });

    it("includes user HTML components", () => {
      const MockDiv = vi.fn(() => null);
      const { result } = renderHook(() =>
        useAdaptedComponents({
          components: { div: MockDiv },
        }),
      );
      expect(result.current?.div).toBe(MockDiv);
      expect(result.current).toHaveProperty("pre");
    });

    it("excludes SyntaxHighlighter and CodeHeader from direct pass-through", () => {
      const MockSyntax = vi.fn(() => null);
      const MockHeader = vi.fn(() => null);
      const { result } = renderHook(() =>
        useAdaptedComponents({
          components: {
            SyntaxHighlighter: MockSyntax,
            CodeHeader: MockHeader,
          },
        }),
      );
      // These should be used to create code adapter, not passed directly
      expect(result.current).toHaveProperty("code");
      expect(result.current).toHaveProperty("pre");
    });
  });

  describe("user pre and code", () => {
    it("passes user code through untouched when no adapter trigger is set", () => {
      const Code = vi.fn(() => null);
      const { result } = renderHook(() =>
        useAdaptedComponents({ components: { code: Code } }),
      );
      expect(result.current.code).toBe(Code);
    });

    it("replaces user code with the adapter when SyntaxHighlighter is set", () => {
      const Code = vi.fn(() => null);
      const MockSyntax = vi.fn(() => null);
      const { result } = renderHook(() =>
        useAdaptedComponents({
          components: { code: Code, SyntaxHighlighter: MockSyntax } as never,
        }),
      );
      expect(result.current.code).not.toBe(Code);
      expect(result.current.pre).toBeDefined();
    });

    it("never hands user pre or code to streamdown directly", () => {
      const Pre = vi.fn(() => null);
      const { result } = renderHook(() =>
        useAdaptedComponents({ components: { pre: Pre } }),
      );
      expect(result.current.pre).not.toBe(Pre);
    });
  });

  describe("pre identity", () => {
    const rawPreNode = {
      type: "element",
      tagName: "pre",
      properties: {},
      children: [{ type: "text", value: "raw" }],
    } as never;

    it("keeps the same pre component across renders with a fresh components object", () => {
      const Pre = ({ node: _, ...p }: any) => <pre {...p} />;
      const { result, rerender } = renderHook(
        ({ components }) => useAdaptedComponents({ components }),
        { initialProps: { components: { pre: Pre } } },
      );
      const first = result.current.pre;
      rerender({ components: { pre: Pre } });
      expect(result.current.pre).toBe(first);
    });

    it("keeps the same pre component when the user pre is an inline arrow", () => {
      const { result, rerender } = renderHook(
        ({ tick }) =>
          useAdaptedComponents({
            components: { pre: ({ node: _, ...p }: any) => <pre {...p} /> },
            componentsByLanguage: tick ? {} : undefined,
          }),
        { initialProps: { tick: 0 } },
      );
      const first = result.current.pre;
      rerender({ tick: 1 });
      expect(result.current.pre).toBe(first);
    });

    it("renders a raw pre through the fallback after the pre changes", () => {
      const PreA = ({ node: _, ...p }: any) => (
        <pre data-testid="pre-a" {...p} />
      );
      const PreB = ({ node: _, ...p }: any) => (
        <pre data-testid="pre-b" {...p} />
      );
      const { result, rerender } = renderHook(
        ({ components }) => useAdaptedComponents({ components }),
        { initialProps: { components: { pre: PreA } } },
      );
      rerender({ components: { pre: PreB } });
      render(
        createElement(
          result.current.pre as React.ComponentType<Record<string, unknown>>,
          { node: rawPreNode },
          "raw",
        ),
      );
      expect(screen.getByTestId("pre-b").textContent).toBe("raw");
    });
  });

  describe("code identity", () => {
    it("keeps the same code component across renders with a fresh components object", () => {
      const Pre = ({ node: _, ...p }: any) => <pre {...p} />;
      const Code = ({ node: _, ...p }: any) => <code {...p} />;
      const { result, rerender } = renderHook(
        ({ components }) => useAdaptedComponents({ components }),
        { initialProps: { components: { pre: Pre, code: Code } } },
      );
      const first = result.current.code;
      rerender({ components: { pre: Pre, code: Code } });
      expect(result.current.code).toBe(first);
    });

    it("keeps the same code component when the user pre and code are inline arrows", () => {
      const { result, rerender } = renderHook(
        ({ tick }) =>
          useAdaptedComponents({
            components: {
              pre: ({ node: _, ...p }: any) => <pre {...p} />,
              code: ({ node: _, ...p }: any) => <code {...p} />,
            },
            componentsByLanguage: tick ? {} : undefined,
          }),
        { initialProps: { tick: 0 } },
      );
      const first = result.current.code;
      rerender({ tick: 1 });
      expect(result.current.code).toBe(first);
    });

    it("keeps the same code component when componentsByLanguage is a fresh object", () => {
      const SyntaxHighlighter = () => null;
      const { result, rerender } = renderHook(
        ({ componentsByLanguage }) =>
          useAdaptedComponents({ componentsByLanguage }),
        {
          initialProps: { componentsByLanguage: { ts: { SyntaxHighlighter } } },
        },
      );
      const first = result.current.code;
      rerender({ componentsByLanguage: { ts: { SyntaxHighlighter } } });
      expect(result.current.code).toBe(first);
    });
  });

  describe("with SyntaxHighlighter", () => {
    it("creates code adapter when SyntaxHighlighter provided", () => {
      const MockSyntax = vi.fn(() => null);
      const { result } = renderHook(() =>
        useAdaptedComponents({
          components: { SyntaxHighlighter: MockSyntax },
        }),
      );
      expect(result.current).toHaveProperty("code");
    });

    it("the resolved code component renders as JSX without throwing", () => {
      const MockSyntax = vi.fn(
        ({ code, language }: { code: string; language: string }) => (
          <div data-testid="highlighter">{`${language}:${code}`}</div>
        ),
      );
      const { result } = renderHook(() =>
        useAdaptedComponents({
          components: { SyntaxHighlighter: MockSyntax } as never,
        }),
      );
      const CodeComponent = result.current?.code;
      expect(CodeComponent).toBeDefined();

      // Render via createElement — the path streamdown + react-markdown take.
      // Direct function invocation would crash on the memo exotic; a
      // render failure here surfaces the TypeError directly.
      render(
        createElement(
          CodeComponent as React.ComponentType<Record<string, unknown>>,
          {
            className: "language-ts",
            "data-block": "true",
          },
          "const x = 1;",
        ),
      );

      expect(screen.getByTestId("highlighter").textContent).toBe(
        "ts:const x = 1;",
      );
    });

    it("creates code adapter when CodeHeader provided", () => {
      const MockHeader = vi.fn(() => null);
      const { result } = renderHook(() =>
        useAdaptedComponents({
          components: { CodeHeader: MockHeader },
        }),
      );
      expect(result.current).toHaveProperty("code");
    });
  });

  describe("with componentsByLanguage", () => {
    it("creates code adapter when componentsByLanguage provided", () => {
      const MockMermaid = vi.fn(() => null);
      const { result } = renderHook(() =>
        useAdaptedComponents({
          componentsByLanguage: {
            mermaid: { SyntaxHighlighter: MockMermaid },
          },
        }),
      );
      expect(result.current).toHaveProperty("code");
    });

    it("handles multiple language overrides", () => {
      const MockPython = vi.fn(() => null);
      const MockRust = vi.fn(() => null);
      const { result } = renderHook(() =>
        useAdaptedComponents({
          componentsByLanguage: {
            python: { SyntaxHighlighter: MockPython },
            rust: { SyntaxHighlighter: MockRust },
          },
        }),
      );
      expect(result.current).toHaveProperty("code");
    });

    it("handles empty componentsByLanguage", () => {
      const { result } = renderHook(() =>
        useAdaptedComponents({
          componentsByLanguage: {},
        }),
      );
      // Empty componentsByLanguage should not create code adapter
      expect(result.current).not.toHaveProperty("code");
    });
  });

  describe("memoization", () => {
    it("returns same reference when deps unchanged", () => {
      const components = { div: vi.fn(() => null) };
      const { result, rerender } = renderHook(
        ({ comps }) => useAdaptedComponents({ components: comps }),
        { initialProps: { comps: components } },
      );

      const firstResult = result.current;
      rerender({ comps: components });
      expect(result.current).toBe(firstResult);
    });

    it("returns new reference when components change", () => {
      const { result, rerender } = renderHook(
        ({ comps }) => useAdaptedComponents({ components: comps }),
        {
          initialProps: {
            comps: { div: vi.fn(() => null) } as StreamdownTextComponents,
          },
        },
      );

      const firstResult = result.current;
      rerender({ comps: { span: vi.fn(() => null) } });
      expect(result.current).not.toBe(firstResult);
    });
  });

  describe("combined options", () => {
    it("handles all options together", () => {
      const MockDiv = vi.fn(() => null);
      const MockSyntax = vi.fn(() => null);
      const MockHeader = vi.fn(() => null);
      const MockMermaid = vi.fn(() => null);

      const { result } = renderHook(() =>
        useAdaptedComponents({
          components: {
            div: MockDiv,
            SyntaxHighlighter: MockSyntax,
            CodeHeader: MockHeader,
          },
          componentsByLanguage: {
            mermaid: { SyntaxHighlighter: MockMermaid },
          },
        }),
      );

      expect(result.current?.div).toBe(MockDiv);
      expect(result.current).toHaveProperty("code");
      expect(result.current).toHaveProperty("pre");
    });
  });
});
