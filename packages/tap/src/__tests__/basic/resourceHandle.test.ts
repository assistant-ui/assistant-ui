import { describe, it, expect, vi } from "vitest";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { useState } from "../../react-hooks/useState";

describe("ResourceHandle - Basic Usage", () => {
  it("should create a resource handle with const API", () => {
    const useTestResource = (props: number) => {
      return {
        value: props * 2,
        propsUsed: props,
      };
    };

    const sub = createTapRoot(function Root() {
      return useTestResource(5);
    });

    // The root provides getValue, subscribe, and unmount
    expect(typeof sub.getValue).toBe("function");
    expect(typeof sub.subscribe).toBe("function");
    expect(typeof sub.unmount).toBe("function");

    // Initial state
    expect(sub.getValue().value).toBe(10);
    expect(sub.getValue().propsUsed).toBe(5);
  });

  it("should re-render and notify on internal state change", () => {
    const useTestResource = () => {
      const [count, setCount] = useState(0);
      return { count, increment: () => setCount((c) => c + 1) };
    };

    const sub = createTapRoot(function Root() {
      return useTestResource();
    });

    expect(sub.getValue().count).toBe(0);

    const listener = vi.fn();
    sub.subscribe(listener);

    flushTapSync(() => sub.getValue().increment());

    expect(sub.getValue().count).toBe(1);
    expect(listener).toHaveBeenCalled();
  });

  it("stops notifying each subscriber after it unsubscribes", () => {
    const sub = createTapRoot(function Root() {
      const [count, setCount] = useState(0);
      return { count, increment: () => setCount((value) => value + 1) };
    });

    try {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      const unsub1 = sub.subscribe(subscriber1);
      const unsub2 = sub.subscribe(subscriber2);

      flushTapSync(() => sub.getValue().increment());
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);

      unsub1();
      flushTapSync(() => sub.getValue().increment());
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(2);

      unsub2();
      flushTapSync(() => sub.getValue().increment());
      expect(sub.getValue().count).toBe(3);
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(2);
    } finally {
      sub.unmount();
    }
  });
});
