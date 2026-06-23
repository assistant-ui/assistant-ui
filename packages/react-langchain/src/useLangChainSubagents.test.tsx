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

import { useLangChainSubagents } from "./hooks";

const runSelectorAgainst = createRunSelectorAgainst(mockUseAuiState);

describe("useLangChainSubagents", () => {
  it("returns the stable empty map when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useLangChainSubagents());
    expect(result.current.size).toBe(0);
  });

  it("returns the subagents map from extras", () => {
    const subagents = new Map([["researcher", { namespace: "researcher" }]]);
    runSelectorAgainst(makeExtras({ subagents }));
    const { result } = renderHook(() => useLangChainSubagents());
    expect(result.current).toBe(subagents);
  });

  it("returns the stable empty map when extras carry no subagents", () => {
    runSelectorAgainst(makeExtras({ subagents: undefined }));
    const { result } = renderHook(() => useLangChainSubagents());
    expect(result.current.size).toBe(0);
  });
});
