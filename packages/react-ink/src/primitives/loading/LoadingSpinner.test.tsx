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

// Ink commits a frame one tick after the state update, so each assertion
// advances past the interval boundary rather than landing exactly on it.
describe("LoadingSpinner", () => {
  it("advances a frame on each configured interval", async () => {
    const instance = render(<LoadingSpinner variant="bar" intervalMs={120} />);
    expect(instance.lastFrame()).toContain("[=   ]");

    await vi.advanceTimersByTimeAsync(120);
    await vi.advanceTimersByTimeAsync(1);

    expect(instance.lastFrame()).toContain("[==  ]");
  });

  // The runtime clamps a non-positive delay to 1ms, which would redraw the
  // terminal about a thousand times a second.
  it.each([0, -50])(
    "does not redraw faster than the minimum frame time for intervalMs=%i",
    async (intervalMs) => {
      const instance = render(
        <LoadingSpinner variant="bar" intervalMs={intervalMs} />,
      );
      expect(instance.lastFrame()).toContain("[=   ]");

      await vi.advanceTimersByTimeAsync(10);
      expect(instance.lastFrame()).toContain("[=   ]");

      await vi.advanceTimersByTimeAsync(6);
      await vi.advanceTimersByTimeAsync(1);
      expect(instance.lastFrame()).toContain("[==  ]");
    },
  );
});
