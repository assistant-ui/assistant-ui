import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSettledQueryTracker,
  SEARCH_QUERY_SETTLE_MS,
} from "./query-tracking";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("settled search query tracking", () => {
  it("records only the query the results settle on", () => {
    const onSettled = vi.fn();
    const tracker = createSettledQueryTracker(onSettled);

    for (const query of ["re", "rea", "reac", "react"]) {
      tracker.update(query, 3, true);
      vi.advanceTimersByTime(200);
    }
    expect(onSettled).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SEARCH_QUERY_SETTLE_MS);
    expect(onSettled).toHaveBeenCalledExactlyOnceWith("react", 3);
  });

  it("waits for the results before starting the settle window", () => {
    const onSettled = vi.fn();
    const tracker = createSettledQueryTracker(onSettled);

    tracker.update("runtime", 0, false);
    vi.advanceTimersByTime(SEARCH_QUERY_SETTLE_MS * 2);
    expect(onSettled).not.toHaveBeenCalled();

    tracker.update("runtime", 5, true);
    vi.advanceTimersByTime(SEARCH_QUERY_SETTLE_MS);
    expect(onSettled).toHaveBeenCalledExactlyOnceWith("runtime", 5);
  });

  it("flushes the pending query on close or result click", () => {
    const onSettled = vi.fn();
    const tracker = createSettledQueryTracker(onSettled);

    tracker.update("thread list", 0, true);
    tracker.flush();
    expect(onSettled).toHaveBeenCalledExactlyOnceWith("thread list", 0);

    vi.advanceTimersByTime(SEARCH_QUERY_SETTLE_MS);
    tracker.flush();
    expect(onSettled).toHaveBeenCalledOnce();
  });

  it("skips identical consecutive queries and too-short queries", () => {
    const onSettled = vi.fn();
    const tracker = createSettledQueryTracker(onSettled);

    tracker.update("tools", 2, true);
    tracker.flush();
    tracker.update("tools", 2, true);
    tracker.flush();
    tracker.update("t", 9, true);
    tracker.flush();
    expect(onSettled).toHaveBeenCalledExactlyOnceWith("tools", 2);

    tracker.update("tool", 4, true);
    tracker.flush();
    tracker.update("tools", 2, true);
    tracker.flush();
    expect(onSettled.mock.calls).toEqual([
      ["tools", 2],
      ["tool", 4],
      ["tools", 2],
    ]);
  });

  it("drops a pending query cleared before it settles", () => {
    const onSettled = vi.fn();
    const tracker = createSettledQueryTracker(onSettled);

    tracker.update("markdown", 1, true);
    tracker.update("", 0, true);
    tracker.flush();
    vi.advanceTimersByTime(SEARCH_QUERY_SETTLE_MS);
    expect(onSettled).not.toHaveBeenCalled();
  });
});
