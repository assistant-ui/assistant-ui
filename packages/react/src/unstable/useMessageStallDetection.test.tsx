/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  state: {
    message: {
      status: { type: "running" },
      content: [{ type: "text", text: "first" }],
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: (state: typeof store.state) => unknown) =>
      selector(store.state),
  };
});

import { unstable_useMessageStallDetection } from "./useMessageStallDetection";

describe("unstable_useMessageStallDetection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    store.state.message.content = [{ type: "text", text: "first" }];
  });

  afterEach(() => vi.useRealTimers());

  it("resets the stall timer for equal-length content changes", async () => {
    const { result, rerender } = renderHook(() =>
      unstable_useMessageStallDetection({ thresholdMs: 2000 }),
    );

    await act(() => vi.advanceTimersByTimeAsync(1500));
    store.state.message.content = [{ type: "text", text: "other" }];
    rerender();
    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(result.current.stalled).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.stalled).toBe(true);
  });
});
