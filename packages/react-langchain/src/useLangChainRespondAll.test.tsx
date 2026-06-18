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

import { useLangChainRespondAll } from "./useStreamRuntime";

describe("useLangChainRespondAll", () => {
  it("forwards the responses and options to stream.respondAll", async () => {
    const respondAll = vi.fn().mockResolvedValue(undefined);
    mockUseAui.mockReturnValue({
      thread: () => ({
        getState: () => ({ extras: makeExtras({ respondAll }) }),
      }),
    });

    const { result } = renderHook(() => useLangChainRespondAll());
    await result.current(
      { a: { approved: true }, b: { approved: false } },
      { metadata: { src: "ui" } },
    );

    expect(respondAll).toHaveBeenCalledWith(
      { a: { approved: true }, b: { approved: false } },
      { metadata: { src: "ui" } },
    );
  });

  it("throws when extras are absent or unbranded", () => {
    mockUseAui.mockReturnValue({
      thread: () => ({ getState: () => ({ extras: { respondAll: vi.fn() } }) }),
    });

    const { result } = renderHook(() => useLangChainRespondAll());
    expect(() => result.current({ a: { approved: true } })).toThrow(
      "This method can only be called when you are using useStreamRuntime",
    );
  });
});
