import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAdaptedComponents } from "../adapters/components-adapter";
import type { StreamdownTextComponents } from "../types";

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

  describe("with SyntaxHighlighter", () => {
    it("creates code adapter when SyntaxHighlighter provided", () => {
      const MockSyntax = vi.fn(() => null);
      const { result } = renderHook(() =>
        useAdaptedComponents({
          components: { SyntaxHighlighter: MockSyntax },
        }),
      );
      expect(result.current).toHaveProperty("code");
      expect(typeof result.current?.code).toBe("function");
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
