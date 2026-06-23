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

import { useLangChainToolCalls } from "./hooks";

const runSelectorAgainst = createRunSelectorAgainst(mockUseAuiState);

describe("useLangChainToolCalls", () => {
  it("returns an empty array when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useLangChainToolCalls());
    expect(result.current).toEqual([]);
  });

  it("returns the assembled tool calls from extras", () => {
    const toolCalls = [{ id: "a", name: "search", args: { q: "x" } }];
    runSelectorAgainst(makeExtras({ toolCalls }));
    const { result } = renderHook(() => useLangChainToolCalls());
    expect(result.current).toBe(toolCalls);
  });

  it("returns an empty array when extras carry no tool calls", () => {
    runSelectorAgainst(makeExtras({ toolCalls: undefined }));
    const { result } = renderHook(() => useLangChainToolCalls());
    expect(result.current).toEqual([]);
  });
});
