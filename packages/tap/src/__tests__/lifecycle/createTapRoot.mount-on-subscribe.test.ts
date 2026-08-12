import { describe, it, expect, vi } from "vitest";
import { createTapRoot } from "../../core/createTapRoot";
import { useEffect } from "../../react-hooks/useEffect";
import { useState } from "../../react-hooks/useState";
import { isDevelopment } from "../../core/helpers/env";

const mountRuns = isDevelopment ? 2 : 1;

const flushUpdates = () => new Promise((resolve) => setTimeout(resolve, 0));

const createCounterRoot = () => {
  let setCount: (value: number) => void;
  const events: string[] = [];
  const root = createTapRoot(
    () => {
      useEffect(() => {
        events.push("mount");
        return () => events.push("unmount");
      });
      const [count, setState] = useState(0);
      setCount = setState;
      return count;
    },
    { mountOnSubscribe: true },
  );
  return { root, events, setCount: (value: number) => setCount(value) };
};

describe("createTapRoot mountOnSubscribe", () => {
  it("mounts immediately by default", () => {
    const effect = vi.fn();
    const root = createTapRoot(() => {
      useEffect(effect);
      return 1;
    });

    expect(effect).toHaveBeenCalledTimes(mountRuns);
    root.unmount();
  });

  it("renders eagerly without running effects", () => {
    const effect = vi.fn();
    const root = createTapRoot(
      () => {
        useEffect(effect);
        const [count] = useState(42);
        return count;
      },
      { mountOnSubscribe: true },
    );

    expect(root.getValue()).toBe(42);
    expect(effect).not.toHaveBeenCalled();
    root.unmount();
    expect(effect).not.toHaveBeenCalled();
  });

  it("commits effects on first subscribe only once", () => {
    const effect = vi.fn();
    const root = createTapRoot(
      () => {
        useEffect(effect);
        return null;
      },
      { mountOnSubscribe: true },
    );

    root.subscribe(() => {});
    expect(effect).toHaveBeenCalledTimes(mountRuns);

    root.subscribe(() => {});
    expect(effect).toHaveBeenCalledTimes(mountRuns);
    root.unmount();
  });

  it("soft unmounts on last unsubscribe and remounts on next subscribe", () => {
    const { root, events } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    events.length = 0;

    unsubscribe();
    expect(events).toEqual(["unmount"]);

    root.subscribe(() => {});
    expect(events).toEqual(["unmount", "mount"]);
    root.unmount();
  });

  it("keeps effects mounted while any subscriber remains", () => {
    const { root, events } = createCounterRoot();

    const unsubscribeA = root.subscribe(() => {});
    const unsubscribeB = root.subscribe(() => {});
    events.length = 0;

    unsubscribeA();
    expect(events).toEqual([]);

    unsubscribeB();
    expect(events).toEqual(["unmount"]);
    root.unmount();
  });

  it("unsubscribe is idempotent", () => {
    const { root, events } = createCounterRoot();

    const unsubscribeA = root.subscribe(() => {});
    const unsubscribeB = root.subscribe(() => {});
    events.length = 0;

    unsubscribeA();
    unsubscribeA();
    expect(events).toEqual([]);

    unsubscribeB();
    expect(events).toEqual(["unmount"]);
    root.unmount();
  });

  it("preserves state across an unsubscribe/resubscribe cycle", async () => {
    const { root, setCount } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    setCount(5);
    await flushUpdates();
    expect(root.getValue()).toBe(5);

    unsubscribe();
    root.subscribe(() => {});
    expect(root.getValue()).toBe(5);
    root.unmount();
  });

  it("supports repeated mount/unmount cycles", () => {
    const { root, events } = createCounterRoot();

    for (let i = 0; i < 3; i++) {
      const unsubscribe = root.subscribe(() => {});
      unsubscribe();
    }

    expect(events.slice(mountRuns === 2 ? 3 : 1)).toEqual([
      "unmount",
      "mount",
      "unmount",
      "mount",
      "unmount",
    ]);
    root.unmount();
  });

  it("applies state updates while soft-unmounted without running effects", async () => {
    const { root, events, setCount } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    unsubscribe();
    events.length = 0;

    setCount(7);
    await flushUpdates();
    expect(root.getValue()).toBe(7);
    expect(events).toEqual([]);

    root.subscribe(() => {});
    expect(events).toEqual(["mount"]);
    expect(root.getValue()).toBe(7);
    root.unmount();
  });

  it("propagates state updates to subscribers", async () => {
    const { root, setCount } = createCounterRoot();

    const listener = vi.fn();
    root.subscribe(listener);

    setCount(5);
    await flushUpdates();

    expect(root.getValue()).toBe(5);
    expect(listener).toHaveBeenCalledTimes(1);
    root.unmount();
  });

  it("throws on state updates before the first subscriber", () => {
    const { root, setCount } = createCounterRoot();

    expect(() => setCount(1)).toThrow("Resource updated before mount");
    root.unmount();
  });

  it("unmount before any subscriber is a no-op", () => {
    const { root, events } = createCounterRoot();

    root.unmount();
    expect(events).toEqual([]);
    expect(root.getValue()).toBe(0);
  });

  it("explicit unmount is terminal", () => {
    const { root, events } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    events.length = 0;

    root.unmount();
    expect(events).toEqual(["unmount"]);

    const listener = vi.fn();
    const noopUnsubscribe = root.subscribe(listener);
    expect(events).toEqual(["unmount"]);
    noopUnsubscribe();
    unsubscribe();
    expect(events).toEqual(["unmount"]);
  });
});
