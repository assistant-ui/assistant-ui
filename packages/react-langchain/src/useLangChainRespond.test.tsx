// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { makeExtras } from "./__tests__/langChainTestUtils";

const { mockUseAui } = vi.hoisted(() => ({
  mockUseAui: vi.fn(),
}));

vi.mock(import("@assistant-ui/store"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAui: (() => mockUseAui()) as unknown as typeof actual.useAui,
  };
});

import { useLangChainRespond } from "./useStreamRuntime";

describe("useLangChainRespond", () => {
  it("forwards the response and options to stream.respond", async () => {
    const respond = vi.fn().mockResolvedValue(undefined);
    mockUseAui.mockReturnValue({
      thread: () => ({
        getState: () => ({ extras: makeExtras({ respond }) }),
      }),
    });

    const { result } = renderHook(() => useLangChainRespond());
    await result.current({ approved: true }, { interruptId: "x" });

    expect(respond).toHaveBeenCalledWith(
      { approved: true },
      { interruptId: "x" },
    );
  });

  it("throws when extras are absent or unbranded", () => {
    mockUseAui.mockReturnValue({
      thread: () => ({ getState: () => ({ extras: { respond: vi.fn() } }) }),
    });

    const { result } = renderHook(() => useLangChainRespond());
    expect(() => result.current({ approved: true })).toThrow(
      "This method can only be called when you are using useStreamRuntime",
    );
  });
});
