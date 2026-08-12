import { describe, it, expect, vi } from "vitest";
import { createTapRoot } from "../../core/createTapRoot";
import { useEffect } from "../../react-hooks/useEffect";
import { useMemo } from "../../react-hooks/useMemo";
import { useRef } from "../../react-hooks/useRef";
import { useState } from "../../react-hooks/useState";
import { isDevelopment } from "../../core/helpers/env";

const mountRuns = isDevelopment ? 2 : 1;

const flushUpdates = () => new Promise((resolve) => setTimeout(resolve, 0));

const createCounterRoot = () => {
  let setCount: (value: number) => void;
  const events: string[] = [];
  const root = createTapRoot(
    function Counter() {
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
    const root = createTapRoot(function Immediate() {
      useEffect(effect);
      return 1;
    });

    expect(effect).toHaveBeenCalledTimes(mountRuns);
    root.unmount();
  });

  it("renders eagerly without running effects", () => {
    const effect = vi.fn();
    const root = createTapRoot(
      function Eager() {
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
      function EffectOnly() {
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

  it("notifies the first subscriber of updates dispatched during its own mount", () => {
    const root = createTapRoot(
      function MountUpdate() {
        const [count, setCount] = useState(0);
        useEffect(() => {
          setCount(1);
        }, [setCount]);
        return count;
      },
      { mountOnSubscribe: true },
    );

    const listener = vi.fn();
    root.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(root.getValue()).toBe(1);
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

  it("preserves ref and memo cells across an unsubscribe/resubscribe cycle", () => {
    const memoFn = vi.fn(() => ({}));
    const root = createTapRoot(
      function Cells() {
        const ref = useRef<{ marker?: true }>({});
        const memoized = useMemo(memoFn, []);
        return { ref: ref.current, memoized };
      },
      { mountOnSubscribe: true },
    );

    const first = root.getValue();
    first.ref.marker = true;
    const memoCalls = memoFn.mock.calls.length;

    const unsubscribe = root.subscribe(() => {});
    unsubscribe();
    root.subscribe(() => {});

    const second = root.getValue();
    expect(second.ref).toBe(first.ref);
    expect(second.ref.marker).toBe(true);
    expect(second.memoized).toBe(first.memoized);
    expect(memoFn).toHaveBeenCalledTimes(memoCalls);
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

  it("explicit unmount is terminal", async () => {
    const { root, events, setCount } = createCounterRoot();

    const listener = vi.fn();
    const unsubscribe = root.subscribe(listener);
    events.length = 0;

    root.unmount();
    expect(events).toEqual(["unmount"]);

    setCount(9);
    await flushUpdates();
    expect(listener).not.toHaveBeenCalled();
    expect(events).toEqual(["unmount"]);

    const lateListener = vi.fn();
    const noopUnsubscribe = root.subscribe(lateListener);
    expect(events).toEqual(["unmount"]);
    setCount(10);
    await flushUpdates();
    expect(lateListener).not.toHaveBeenCalled();

    noopUnsubscribe();
    unsubscribe();
    expect(events).toEqual(["unmount"]);
  });
});
