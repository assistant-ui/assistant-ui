import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ControlledMessageChannel,
  lastChannel,
  pump,
} from "../controlled-channel";

describe("createTapRoot dispatch batching", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    ControlledMessageChannel.instances = [];
  });

  it("applies more than 50 dispatches into one root in a single macrotask", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { createTapRoot } = await import("../../core/createTapRoot");
    const { useState } = await import("../../react-hooks/useState");

    let setCount!: (updater: (count: number) => number) => void;
    const root = createTapRoot(() => {
      const [count, set] = useState(0);
      setCount = set;
      return count;
    });

    for (let i = 0; i < 60; i += 1) {
      setCount((count) => count + 1);
    }
    pump(lastChannel());
    expect(root.getValue()).toBe(60);
    root.unmount();
  });

  it("a root dropped by the run guard recovers on the next dispatch instead of losing updates", async () => {
    // A setState-in-effect loop trips the guard (~50 re-runs). The root is
    // dropped but left dirty, so the NEXT external dispatch re-queues it
    // and its task drains the stranded queue - no silent update loss.
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { createTapRoot } = await import("../../core/createTapRoot");
    const { useState } = await import("../../react-hooks/useState");
    const { useEffect } = await import("../../react-hooks/useEffect");

    let setCount!: (updater: (count: number) => number) => void;
    let setGo!: (updater: (go: boolean) => boolean) => void;
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

    // Start the loop after mount: it trips the guard in the next flush.
    setGo(() => true);
    expect(() => pump(lastChannel())).toThrow(/Maximum update depth exceeded/);

    setGo(() => false);
    expect(() => pump(lastChannel())).not.toThrow();
    setCount(() => 42);
    expect(() => pump(lastChannel())).not.toThrow();
    expect(root.getValue()).toBe(42);
    root.unmount();
  });
});
