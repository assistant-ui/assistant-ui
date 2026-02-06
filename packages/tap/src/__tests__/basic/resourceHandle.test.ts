import { describe, it, expect, vi } from "vitest";
import { createResourceRoot } from "../../core/createResourceRoot";
import { resource } from "../../core/resource";

describe("ResourceHandle - Basic Usage", () => {
  it("should create a resource handle with const API", () => {
    const TestResource = resource((props: number) => {
      return {
        value: props * 2,
        propsUsed: props,
      };
    });
    const root = createResourceRoot();
    const sub = root.render(TestResource(5));

    // The subscribable provides getValue and subscribe
    expect(typeof sub.getValue).toBe("function");
    expect(typeof sub.subscribe).toBe("function");
    expect(typeof root.render).toBe("function");

    // Initial state
    expect(sub.getValue().value).toBe(10);
    expect(sub.getValue().propsUsed).toBe(5);
  });

  it("should allow updating props", () => {
    const TestResource = resource((props: { multiplier: number }) => {
      return { result: 10 * props.multiplier };
    });
    const root = createResourceRoot();
    const sub = root.render(TestResource({ multiplier: 2 }));

    // Initial state
    expect(sub.getValue().result).toBe(20);

    // Can call render to update props
    expect(() => root.render(TestResource({ multiplier: 3 }))).not.toThrow();
  });

  it("should support subscribing and unsubscribing", () => {
    const TestResource = resource(() => ({ timestamp: Date.now() }));
    const root = createResourceRoot();
    const sub = root.render(TestResource());

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
