import { describe, expect, it } from "vitest";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { useEffect } from "../../react-hooks/useEffect";
import { useState } from "../../react-hooks/useState";

const createCounter = () => {
  let set!: (value: number) => void;
  const root = createTapRoot(function Counter() {
    const [count, setCount] = useState(0);
    set = setCount;
    return count;
  });
  return { root, set: (value: number) => set(value) };
};

const createLazy = (events: string[]) =>
  createTapRoot(
    function Lazy() {
      useEffect(() => {
        events.push("setup");
        return () => events.push("cleanup");
      }, []);
      return 1;
    },
    { mountOnSubscribe: true },
  );

describe("subscribing to a mountOnSubscribe root from a notification", () => {
  it("keeps the mount when a later notification's listener throws", () => {
    const a = createCounter();
    const c = createCounter();
    const events: string[] = [];
    const lazy = createLazy(events);

    let subscribeError: unknown = null;
    a.root.subscribe(() => {
      try {
        lazy.subscribe(() => {});
      } catch (error) {
        subscribeError = error;
      }
    });
    c.root.subscribe(() => {
      throw new Error("listener");
    });

    expect(() =>
      flushTapSync(() => {
        a.set(1);
        c.set(1);
      }),
    ).toThrow("listener");
    expect(subscribeError).toBeNull();
    expect(events.at(-1)).toBe("setup");
  });

  it("delivers the notifications queued behind it after the listener returns", () => {
    const a = createCounter();
    const c = createCounter();
    const lazy = createLazy([]);
    const order: string[] = [];

    a.root.subscribe(() => {
      order.push("a:start");
      lazy.subscribe(() => {});
      order.push("a:end");
    });
    c.root.subscribe(() => order.push("c"));

    flushTapSync(() => {
      a.set(1);
      c.set(1);
    });

    expect(order).toEqual(["a:start", "a:end", "c"]);
  });
});
