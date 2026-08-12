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

  it("renders lazily on first read without running effects", () => {
    const body = vi.fn();
    const effect = vi.fn();
    const root = createTapRoot(
      function Lazy() {
        body();
        useEffect(effect);
        const [count] = useState(42);
        return count;
      },
      { mountOnSubscribe: true },
    );

    expect(body).not.toHaveBeenCalled();
    expect(root.getValue()).toBe(42);
    expect(body).toHaveBeenCalled();
    expect(effect).not.toHaveBeenCalled();
  });

  it("renders lazily on first subscribe", () => {
    const body = vi.fn();
    const root = createTapRoot(
      function LazySubscribe() {
        body();
        return 1;
      },
      { mountOnSubscribe: true },
    );

    expect(body).not.toHaveBeenCalled();
    root.subscribe(() => {});
    expect(body).toHaveBeenCalled();
    expect(root.getValue()).toBe(1);
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
    expect(effect).toHaveBeenCalledTimes(1);

    root.subscribe(() => {});
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("dev strict mode double renders without double-invoking effects", () => {
    const body = vi.fn();
    const effect = vi.fn();
    const root = createTapRoot(
      function Strict() {
        body();
        useEffect(effect);
        return 1;
      },
      { mountOnSubscribe: true },
    );

    const unsubscribe = root.subscribe(() => {});
    expect(body).toHaveBeenCalledTimes(mountRuns);
    expect(effect).toHaveBeenCalledTimes(1);

    unsubscribe();
    root.subscribe(() => {});
    expect(body).toHaveBeenCalledTimes(mountRuns * 2);
    expect(effect).toHaveBeenCalledTimes(2);
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
  });

  it("soft unmounts on last unsubscribe and remounts on next subscribe", () => {
    const { root, events } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    events.length = 0;

    unsubscribe();
    expect(events).toEqual(["unmount"]);

    root.subscribe(() => {});
    expect(events).toEqual(["unmount", "mount"]);
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
  });

  it("supports repeated mount/unmount cycles", () => {
    const { root, events } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    events.length = 0;
    unsubscribe();

    for (let i = 0; i < 2; i++) {
      const unsubscribe = root.subscribe(() => {});
      unsubscribe();
    }

    expect(events).toEqual(["unmount", "mount", "unmount", "mount", "unmount"]);
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
  });

  it("propagates state updates to subscribers", async () => {
    const { root, setCount } = createCounterRoot();

    const listener = vi.fn();
    root.subscribe(listener);

    setCount(5);
    await flushUpdates();

    expect(root.getValue()).toBe(5);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("throws on state updates before the first subscriber", () => {
    const { root, setCount } = createCounterRoot();

    expect(root.getValue()).toBe(0);
    expect(() => setCount(1)).toThrow("Resource updated before mount");
  });

  it("rolls back a failed first mount so a later subscriber can retry", () => {
    const cleanup = vi.fn();
    let shouldThrow = true;
    const root = createTapRoot(
      function Failing() {
        useEffect(() => cleanup);
        useEffect(() => {
          if (shouldThrow) throw new Error("mount failed");
        });
        return 1;
      },
      { mountOnSubscribe: true },
    );

    expect(() => root.subscribe(() => {})).toThrow("mount failed");
    expect(cleanup).toHaveBeenCalled();

    shouldThrow = false;
    const listener = vi.fn();
    const unsubscribe = root.subscribe(listener);
    expect(root.getValue()).toBe(1);
    unsubscribe();
  });

  it("throws on unmount()", () => {
    const { root } = createCounterRoot();

    expect(() => root.unmount()).toThrow(
      "unmount() is not supported with mountOnSubscribe",
    );
  });
});
