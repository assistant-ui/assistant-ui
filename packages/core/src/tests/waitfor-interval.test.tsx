// @vitest-environment jsdom
import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const TESTING_LIBRARY_DEFAULT_POLL_MS = 50;

const firstPollDelay = async (run: () => Promise<unknown>) => {
  const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
  await run();
  return setIntervalSpy.mock.calls[0]?.[1];
};

describe("shared waitFor setup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("polls faster than Testing Library's default when a test sets no interval", async () => {
    const delay = await firstPollDelay(() => waitFor(() => undefined));

    expect(delay).toBeLessThan(TESTING_LIBRARY_DEFAULT_POLL_MS);
  });

  it("keeps an interval a test passes itself", async () => {
    const delay = await firstPollDelay(() =>
      waitFor(() => undefined, { interval: 23 }),
    );

    expect(delay).toBe(23);
  });

  it("still rejects when the condition never holds", async () => {
    await expect(
      waitFor(
        () => {
          throw new Error("never ready");
        },
        { timeout: 20 },
      ),
    ).rejects.toThrow("never ready");
  });
});
