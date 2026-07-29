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

  it("a root dropped by the run guard recovers on the next dispatch instead of losing updates", async () => {
    // A setState-in-effect loop trips the guard (~50 re-runs). The root is
    // dropped but left dirty, so the NEXT external dispatch re-queues it
    // and its task drains the stranded queue - no silent update loss.
    let setCount!: (updater: (count: number) => number) => void;
    let setGo!: (updater: (go: boolean) => boolean) => void;
    const uncaught: unknown[] = [];
    const onError = (error: unknown) => {
      uncaught.push(error);
    };
    process.on("uncaughtException", onError);
    try {
      const root = createTapRoot(() => {
        const [count, setC] = useState(0);
        const [go, setG] = useState(false);
        setCount = setC;
        setGo = setG;
        useEffect(() => {
          if (go) setC((c) => c + 1);
        });
        return count;
      });

      // Start the loop after mount, so it trips the guard in a macrotask
      // flush rather than the synchronous mount commit.
      setGo(() => true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(
        uncaught.some((error) =>
          String(error).includes("Maximum update depth exceeded"),
        ),
      ).toBe(true);

      setGo(() => false);
      await new Promise((resolve) => setTimeout(resolve, 50));
      setCount(() => 42);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(root.getValue()).toBe(42);
      root.unmount();
    } finally {
      process.removeListener("uncaughtException", onError);
    }
  });
});
