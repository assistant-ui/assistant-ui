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

import { useAISDKChat } from "./hooks";

const runSelectorAgainst = createRunSelectorAgainst(mockUseAuiState);

describe("useAISDKChat", () => {
  it("returns undefined when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useAISDKChat());
    expect(result.current).toBeUndefined();
  });

  it("returns the chat helpers handle when extras carry chat", () => {
    const chat = { id: "chat-1", resumeStream: vi.fn() };
    runSelectorAgainst(makeExtras({ chat }));
    const { result } = renderHook(() => useAISDKChat());
    expect(result.current).toBe(chat);
  });

  it("returns undefined when extras belong to another runtime", () => {
    runSelectorAgainst({ chat: { id: "chat-1" } });
    const { result } = renderHook(() => useAISDKChat());
    expect(result.current).toBeUndefined();
  });
});
