import { describe, it, expect } from "vitest";
import { createTapRoot } from "../../core/createTapRoot";
import { useState } from "../../react-hooks/useState";
import { useEffect } from "../../react-hooks/useEffect";

describe("createTapRoot dispatch batching", () => {
  it("applies more than 50 dispatches into one root in a single macrotask", async () => {
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

  it("drains a re-entrant dispatch (raised during the flush) in a follow-up task", async () => {
    // A setState fired from an effect mid-flush must not loop the drain
    // task forever: it is re-queued and lands in a follow-up run.
    let setCount!: (updater: (count: number) => number) => void;
    const root = createTapRoot(() => {
      const [count, set] = useState(0);
      setCount = set;
      useEffect(() => {
        set(1);
      }, []);
      return count;
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(root.getValue()).toBe(1);
    expect(setCount).toBeTypeOf("function");
    root.unmount();
  });
});
