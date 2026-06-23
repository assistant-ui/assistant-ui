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

import { useLangChainSubgraphs } from "./hooks";

const runSelectorAgainst = createRunSelectorAgainst(mockUseAuiState);

describe("useLangChainSubgraphs", () => {
  it("returns the stable empty map when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useLangChainSubgraphs());
    expect(result.current.size).toBe(0);
  });

  it("returns the subgraphs map from extras", () => {
    const subgraphs = new Map([["planner", { namespace: "planner" }]]);
    runSelectorAgainst(makeExtras({ subgraphs }));
    const { result } = renderHook(() => useLangChainSubgraphs());
    expect(result.current).toBe(subgraphs);
  });

  it("returns the stable empty map when extras carry no subgraphs", () => {
    runSelectorAgainst(makeExtras({ subgraphs: undefined }));
    const { result } = renderHook(() => useLangChainSubgraphs());
    expect(result.current.size).toBe(0);
  });
});
