import { describe, it, expect, vi, afterEach } from "vitest";
import { createTapRoot } from "../../core/createTapRoot";
import { useState } from "../../react-hooks/useState";

describe("createTapRoot dispatch batching", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies more than 50 dispatches into one root in a single macrotask", async () => {
    // On main, each dispatch minted a fresh UpdateScheduler, so >50
    // dispatches into one root in one macrotask tripped the flush-depth
    // guard and the rest of the batch was cleared. One scheduler per root
    // must drain them all.
    let setCount!: (updater: (count: number) => number) => void;
    const root = createTapRoot(() => {
      const [count, set] = useState(0);
      setCount = set;
      return count;
    });

    for (let i = 0; i < 60; i += 1) {
      setCount((count) => count + 1);
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root.getValue()).toBe(60);
    root.unmount();
  });
});
