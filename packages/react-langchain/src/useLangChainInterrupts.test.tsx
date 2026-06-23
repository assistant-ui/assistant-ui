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

import { useLangChainInterrupts } from "./hooks";

const runSelectorAgainst = createRunSelectorAgainst(mockUseAuiState);

describe("useLangChainInterrupts", () => {
  it("returns an empty array when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useLangChainInterrupts());
    expect(result.current).toEqual([]);
  });

  it("returns the pending interrupts from extras", () => {
    const interrupts = [{ id: "i1", value: { q: "ok?" } }];
    runSelectorAgainst(makeExtras({ interrupts }));
    const { result } = renderHook(() => useLangChainInterrupts());
    expect(result.current).toBe(interrupts);
  });

  it("returns an empty array when extras carry no interrupts", () => {
    runSelectorAgainst(makeExtras({ interrupts: undefined }));
    const { result } = renderHook(() => useLangChainInterrupts());
    expect(result.current).toEqual([]);
  });
});
