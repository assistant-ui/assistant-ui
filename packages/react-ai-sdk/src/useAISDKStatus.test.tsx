// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  createRunSelectorAgainst,
  makeExtras,
  type Selector,
} from "./__tests__/aiSDKTestUtils";

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

import { useAISDKStatus } from "./hooks";

const runSelectorAgainst = createRunSelectorAgainst(mockUseAuiState);

describe("useAISDKStatus", () => {
  it("returns undefined when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useAISDKStatus());
    expect(result.current).toBeUndefined();
  });

  it("returns the chat status when extras carry status", () => {
    runSelectorAgainst(makeExtras({ status: "streaming" }));
    const { result } = renderHook(() => useAISDKStatus());
    expect(result.current).toBe("streaming");
  });

  it("returns undefined when extras belong to another runtime", () => {
    runSelectorAgainst({ status: "ready" });
    const { result } = renderHook(() => useAISDKStatus());
    expect(result.current).toBeUndefined();
  });
});
