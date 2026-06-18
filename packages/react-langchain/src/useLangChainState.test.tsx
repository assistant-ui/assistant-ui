// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  createRunSelectorAgainst,
  makeExtras,
  type Selector,
} from "./__tests__/langChainTestUtils";

const { mockUseAuiState } = vi.hoisted(() => ({
  mockUseAuiState: vi.fn(),
}));

vi.mock(import("@assistant-ui/store"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuiState: ((selector: Selector) =>
      mockUseAuiState(selector)) as typeof actual.useAuiState,
    useAui: (() => ({})) as unknown as typeof actual.useAui,
  };
});

import { useLangChainState } from "./hooks";

const runSelectorAgainst = createRunSelectorAgainst(mockUseAuiState);

describe("useLangChainState", () => {
  it("returns undefined when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useLangChainState<number>("count"));
    expect(result.current).toBeUndefined();
  });

  it("returns defaultValue when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useLangChainState<number>("count", 42));
    expect(result.current).toBe(42);
  });

  it("reads the value for the given key from extras.values", () => {
    runSelectorAgainst(
      makeExtras({ values: { todos: [{ id: "a" }], count: 7 } }),
    );
    const { result } = renderHook(() =>
      useLangChainState<Array<{ id: string }>>("todos"),
    );
    expect(result.current).toEqual([{ id: "a" }]);
  });

  it("falls back to defaultValue when the key is missing from values", () => {
    runSelectorAgainst(makeExtras({ values: { unrelated: "x" } }));
    const { result } = renderHook(() => useLangChainState<number>("count", 99));
    expect(result.current).toBe(99);
  });

  it("returns undefined when the key is missing and no default is given", () => {
    runSelectorAgainst(makeExtras({ values: { unrelated: "x" } }));
    const { result } = renderHook(() => useLangChainState<number>("count"));
    expect(result.current).toBeUndefined();
  });

  it("returns the stored value (not default) when both are present", () => {
    runSelectorAgainst(makeExtras({ values: { count: 0 } }));
    const { result } = renderHook(() => useLangChainState<number>("count", 99));
    // 0 is a valid value; must be preserved over the default.
    expect(result.current).toBe(0);
  });

  it("preserves explicit null over defaultValue", () => {
    runSelectorAgainst(makeExtras({ values: { flag: null } }));
    const { result } = renderHook(() =>
      useLangChainState<string | null>("flag", "default"),
    );
    // LangGraph treats null as an explicit "cleared" value distinct
    // from a missing key; the hook must not conflate them.
    expect(result.current).toBeNull();
  });
});
