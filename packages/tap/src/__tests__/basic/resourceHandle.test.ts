import { describe, it, expect, vi } from "vitest";
import { createResource } from "../../core/createResource";
import { resource } from "../../core/resource";

describe("ResourceHandle - Basic Usage", () => {
  it("should create a resource handle with const API", () => {
    const TestResource = resource((props: number) => {
      return {
        value: props * 2,
        propsUsed: props,
      };
    });
    const handle = createResource(TestResource(5));

    // The handle provides a const API
    expect(typeof handle.getState).toBe("function");
    expect(typeof handle.subscribe).toBe("function");
    expect(typeof handle.render).toBe("function");

    // Initial state
    expect(handle.getState().value).toBe(10);
    expect(handle.getState().propsUsed).toBe(5);
  });

  it("should allow updating props", () => {
    const TestResource = resource((props: { multiplier: number }) => {
      return { result: 10 * props.multiplier };
    });
    const handle = createResource(TestResource({ multiplier: 2 }));

    // Initial state
    expect(handle.getState().result).toBe(20);

    // Can call render to update props
    expect(() => handle.render(TestResource({ multiplier: 3 }))).not.toThrow();
  });

  it("should support subscribing and unsubscribing", () => {
    const TestResource = resource(() => ({ timestamp: Date.now() }));
    const handle = createResource(TestResource());

    const subscriber1 = vi.fn();
    const subscriber2 = vi.fn();

    // Can subscribe multiple callbacks
    const unsub1 = handle.subscribe(subscriber1);
    const unsub2 = handle.subscribe(subscriber2);

    // Can unsubscribe individually
    expect(typeof unsub1).toBe("function");
    expect(typeof unsub2).toBe("function");

    unsub1();
    unsub2();
  });
});
