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

import { useLangChainError } from "./hooks";

const runSelectorAgainst = createRunSelectorAgainst(mockUseAuiState);

describe("useLangChainError", () => {
  it("returns undefined when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useLangChainError());
    expect(result.current).toBeUndefined();
  });

  it("returns the error value when extras carry error", () => {
    const error = new Error("boom");
    runSelectorAgainst(makeExtras({ error }));
    const { result } = renderHook(() => useLangChainError());
    expect(result.current).toBe(error);
  });

  it("returns undefined when extras carry no error", () => {
    runSelectorAgainst(makeExtras({ error: undefined }));
    const { result } = renderHook(() => useLangChainError());
    expect(result.current).toBeUndefined();
  });
});
