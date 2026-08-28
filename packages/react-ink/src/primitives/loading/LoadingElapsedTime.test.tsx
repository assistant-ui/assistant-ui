import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";

const h = vi.hoisted(() => ({
  isRunning: false,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: <T,>(
      selector: (state: {
        thread: { isRunning: boolean; messages: never[] };
      }) => T,
    ) =>
      selector({
        thread: { isRunning: h.isRunning, messages: [] },
      }),
  };
});

import { LoadingElapsedTime } from "./LoadingElapsedTime";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  h.isRunning = false;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("LoadingElapsedTime", () => {
  it("starts the fallback timer when each run begins", async () => {
    const instance = render(<LoadingElapsedTime />);

    vi.setSystemTime(120_000);
    h.isRunning = true;
    instance.rerender(<LoadingElapsedTime />);
    await vi.advanceTimersByTimeAsync(0);
    expect(instance.lastFrame()).toContain("(0s)");

    await vi.advanceTimersByTimeAsync(2_000);
    expect(instance.lastFrame()).toContain("(2s)");

    h.isRunning = false;
    instance.rerender(<LoadingElapsedTime />);
    vi.setSystemTime(240_000);
    h.isRunning = true;
    instance.rerender(<LoadingElapsedTime />);
    await vi.advanceTimersByTimeAsync(0);
    expect(instance.lastFrame()).toContain("(0s)");
  });
});
