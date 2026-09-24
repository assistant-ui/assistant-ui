import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";

import { LoadingSpinner } from "./LoadingSpinner";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("LoadingSpinner", () => {
  it("advances a frame on each configured interval", async () => {
    const instance = render(<LoadingSpinner variant="bar" intervalMs={120} />);
    expect(instance.lastFrame()).toContain("[=   ]");

    await vi.advanceTimersByTimeAsync(120);
    await vi.advanceTimersByTimeAsync(1);

    expect(instance.lastFrame()).toContain("[==  ]");
  });

  it.each([0, -50, Number.NaN])(
    "does not redraw faster than the minimum frame time for intervalMs=%i",
    async (intervalMs) => {
      const instance = render(
        <LoadingSpinner variant="bar" intervalMs={intervalMs} />,
      );
      expect(instance.lastFrame()).toContain("[=   ]");

      await vi.advanceTimersByTimeAsync(15);
      expect(instance.lastFrame()).toContain("[=   ]");

      await vi.advanceTimersByTimeAsync(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(instance.lastFrame()).toContain("[==  ]");
    },
  );

  it.each([2_592_000_000, Infinity])(
    "clamps large intervalMs=%s to the runtime timer limit",
    (intervalMs) => {
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
      render(<LoadingSpinner variant="bar" intervalMs={intervalMs} />);

      expect(setIntervalSpy).toHaveBeenLastCalledWith(
        expect.any(Function),
        2_147_483_647,
      );
    },
  );
});
