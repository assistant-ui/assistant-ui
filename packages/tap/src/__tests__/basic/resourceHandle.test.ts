import { describe, it, expect, vi } from "vitest";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { useState } from "../../hooks/useState";

describe("ResourceHandle - Basic Usage", () => {
  it("should create a resource handle with const API", () => {
    const useTestResource = (props: number) => {
      return {
        value: props * 2,
        propsUsed: props,
      };
    };

    const sub = createTapRoot(() => useTestResource(5));

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

    const sub = createTapRoot(() => useTestResource());

    expect(sub.getValue().count).toBe(0);

    const listener = vi.fn();
    sub.subscribe(listener);

    flushTapSync(() => sub.getValue().increment());

    expect(sub.getValue().count).toBe(1);
    expect(listener).toHaveBeenCalled();
  });

  it("should support subscribing and unsubscribing", () => {
    const useTestResource = () => {
      return { timestamp: 0 };
    };

    const sub = createTapRoot(() => useTestResource());

    const subscriber1 = vi.fn();
    const subscriber2 = vi.fn();

    // Can subscribe multiple callbacks
    const unsub1 = sub.subscribe(subscriber1);
    const unsub2 = sub.subscribe(subscriber2);

    // Can unsubscribe individually
    expect(typeof unsub1).toBe("function");
    expect(typeof unsub2).toBe("function");

    unsub1();
    unsub2();
  });
});
