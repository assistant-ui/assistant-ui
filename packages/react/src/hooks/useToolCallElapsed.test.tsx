// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { part } = vi.hoisted(() => ({
  part: {
    type: "tool-call" as const,
    status: { type: "running" as const },
    timing: { startedAt: 9000 },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: (
    selector: (state: { optional: { part: typeof part } }) => unknown,
  ) => selector({ optional: { part } }),
}));

import { useToolCallElapsed } from "./useToolCallElapsed";

describe("useToolCallElapsed", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not read the wall clock during server render", () => {
    const nowSpy = vi.spyOn(Date, "now");
    const Probe = () => <span>{useToolCallElapsed() ?? "none"}</span>;

    expect(renderToString(<Probe />)).toBe("<span>none</span>");
    expect(nowSpy).not.toHaveBeenCalled();
  });

  it("reports growing elapsed time after the effect runs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const { result } = renderHook(() => useToolCallElapsed());

    expect(result.current).toBe(1000);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current).toBe(3000);
  });
});
