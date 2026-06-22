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

import { useLangChainStream } from "./hooks";

const runSelectorAgainst = createRunSelectorAgainst(mockUseAuiState);

describe("useLangChainStream", () => {
  it("returns undefined when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useLangChainStream());
    expect(result.current).toBeUndefined();
  });

  it("returns the stream handle from extras", () => {
    const stream = { submit: () => {} };
    runSelectorAgainst(makeExtras({ stream }));
    const { result } = renderHook(() => useLangChainStream());
    expect(result.current).toBe(stream);
  });
});
