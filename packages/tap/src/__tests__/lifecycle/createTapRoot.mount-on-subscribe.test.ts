import { describe, it, expect, vi } from "vitest";
import type { useTapRoot } from "../../hooks/useTapRoot";
import { createTapRoot } from "../../core/createTapRoot";
import { resource } from "../../core/resource";
import { useResource } from "../../hooks/useResource";
import { useEffect } from "../../react-hooks/useEffect";
import { useMemo } from "../../react-hooks/useMemo";
import { useRef } from "../../react-hooks/useRef";
import { useState } from "../../react-hooks/useState";
import { isDevelopment } from "../../core/helpers/env";
import { waitForNextTick as flushUpdates } from "../test-utils";

const mountRuns = isDevelopment ? 2 : 1;
const remountEvents = isDevelopment ? ["mount", "unmount", "mount"] : ["mount"];

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
    expect(effect).toHaveBeenCalledTimes(mountRuns);

    root.subscribe(() => {});
    expect(effect).toHaveBeenCalledTimes(mountRuns);
  });

  it("dev strict mode double invokes effects on every connect", async () => {
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
    expect(effect).toHaveBeenCalledTimes(mountRuns);

    unsubscribe();
    await flushUpdates();
    root.subscribe(() => {});
    expect(body).toHaveBeenCalledTimes(mountRuns);
    expect(effect).toHaveBeenCalledTimes(mountRuns * 2);
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

  it("soft unmounts on last unsubscribe and remounts on next subscribe", async () => {
    const { root, events } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    events.length = 0;

    unsubscribe();
    expect(events).toEqual([]);
    await flushUpdates();
    expect(events).toEqual(["unmount"]);

    root.subscribe(() => {});
    expect(events).toEqual(["unmount", ...remountEvents]);
  });

  it("keeps effects mounted while any subscriber remains", async () => {
    const { root, events } = createCounterRoot();

    const unsubscribeA = root.subscribe(() => {});
    const unsubscribeB = root.subscribe(() => {});
    events.length = 0;

    unsubscribeA();
    await flushUpdates();
    expect(events).toEqual([]);

    unsubscribeB();
    await flushUpdates();
    expect(events).toEqual(["unmount"]);
  });

  it("absorbs an unsubscribe/resubscribe within the same tick", async () => {
    const { root, events } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    events.length = 0;

    unsubscribe();
    root.subscribe(() => {});
    await flushUpdates();
    expect(events).toEqual([]);
  });

  it("unsubscribe is idempotent", async () => {
    const { root, events } = createCounterRoot();

    const unsubscribeA = root.subscribe(() => {});
    const unsubscribeB = root.subscribe(() => {});
    events.length = 0;

    unsubscribeA();
    unsubscribeA();
    await flushUpdates();
    expect(events).toEqual([]);

    unsubscribeB();
    await flushUpdates();
    expect(events).toEqual(["unmount"]);
  });

  it("preserves state across an unsubscribe/resubscribe cycle", async () => {
    const { root, setCount } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    setCount(5);
    await flushUpdates();
    expect(root.getValue()).toBe(5);

    unsubscribe();
    await flushUpdates();
    root.subscribe(() => {});
    expect(root.getValue()).toBe(5);
  });

  it("remounts with fresh state after updates while soft-unmounted", async () => {
    const body = vi.fn();
    const seen: number[] = [];
    const root = createTapRoot(
      function Fresh() {
        body();
        const [count, setCount] = useState(0);
        useEffect(() => {
          seen.push(count);
        }, [count]);
        return { count, setCount };
      },
      { mountOnSubscribe: true },
    );

    const unsubscribe = root.subscribe(() => {});
    unsubscribe();
    await flushUpdates();

    root.getValue().setCount(5);
    await flushUpdates();
    expect(root.getValue().count).toBe(5);

    const renders = body.mock.calls.length;
    root.subscribe(() => {});
    expect(root.getValue().count).toBe(5);
    expect(seen[seen.length - 1]).toBe(5);
    expect(body).toHaveBeenCalledTimes(renders);
  });

  it("remounts without re-rendering when nothing changed while soft-unmounted", async () => {
    const body = vi.fn();
    const effect = vi.fn();
    const root = createTapRoot(
      function Idle() {
        body();
        useEffect(effect);
        return null;
      },
      { mountOnSubscribe: true },
    );

    const unsubscribe = root.subscribe(() => {});
    unsubscribe();
    await flushUpdates();

    const renders = body.mock.calls.length;
    const effects = effect.mock.calls.length;
    root.subscribe(() => {});
    expect(body).toHaveBeenCalledTimes(renders);
    expect(effect).toHaveBeenCalledTimes(effects + mountRuns);
  });

  it("preserves ref and memo cells across an unsubscribe/resubscribe cycle", async () => {
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
    await flushUpdates();
    root.subscribe(() => {});

    const second = root.getValue();
    expect(second.ref).toBe(first.ref);
    expect(second.ref.marker).toBe(true);
    expect(second.memoized).toBe(first.memoized);
    expect(memoFn).toHaveBeenCalledTimes(memoCalls);
  });

  it("supports repeated mount/unmount cycles", async () => {
    const { root, events } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    events.length = 0;
    unsubscribe();
    await flushUpdates();

    for (let i = 0; i < 2; i++) {
      const unsubscribe = root.subscribe(() => {});
      unsubscribe();
      await flushUpdates();
    }

    expect(events).toEqual([
      "unmount",
      ...remountEvents,
      "unmount",
      ...remountEvents,
      "unmount",
    ]);
  });

  it("applies state updates while soft-unmounted without running effects", async () => {
    const { root, events, setCount } = createCounterRoot();

    const unsubscribe = root.subscribe(() => {});
    unsubscribe();
    await flushUpdates();
    events.length = 0;

    setCount(7);
    await flushUpdates();
    expect(root.getValue()).toBe(7);
    expect(events).toEqual([]);

    root.subscribe(() => {});
    expect(events).toEqual(remountEvents);
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

  it("keeps subscriber bookkeeping consistent when a rollback cleanup throws", () => {
    let shouldThrow = true;
    const events: string[] = [];
    const root = createTapRoot(
      function FaultyCleanup() {
        useEffect(() => {
          events.push("mount");
          return () => {
            if (shouldThrow) throw new Error("cleanup failed");
          };
        });
        useEffect(() => {
          if (shouldThrow) throw new Error("mount failed");
        });
        return 1;
      },
      { mountOnSubscribe: true },
    );

    expect(() => root.subscribe(() => {})).toThrow();

    shouldThrow = false;
    events.length = 0;
    root.subscribe(() => {});
    expect(events).toEqual(Array(mountRuns).fill("mount"));
    expect(root.getValue()).toBe(1);
  });

  it("rolls back re-entrant subscriptions made by a failed mount", () => {
    let shouldThrow = true;
    let self: useTapRoot.Root<number>;
    const root = createTapRoot(
      function Reentrant() {
        useEffect(() => self.subscribe(() => {}));
        useEffect(() => {
          if (shouldThrow) throw new Error("mount failed");
        });
        return 1;
      },
      { mountOnSubscribe: true },
    );
    self = root;

    expect(() => root.subscribe(() => {})).toThrow("mount failed");

    shouldThrow = false;
    root.subscribe(() => {});
    expect(root.getValue()).toBe(1);
  });

  it("soft unmounts and remounts nested resources", async () => {
    const childEffect = vi.fn();
    const childCleanup = vi.fn();
    const grandchildEffect = vi.fn();
    const grandchildCleanup = vi.fn();

    const Grandchild = resource(function useGrandchild() {
      const [count, setCount] = useState(0);
      useEffect(() => {
        grandchildEffect();
        return grandchildCleanup;
      });
      return { count, setCount };
    });

    const Child = resource(function useChild() {
      useEffect(() => {
        childEffect();
        return childCleanup;
      });
      return useResource(Grandchild());
    });

    const root = createTapRoot(
      function Nested() {
        return useResource(Child());
      },
      { mountOnSubscribe: true },
    );

    const unsubscribe = root.subscribe(() => {});
    const mountedChildEffects = childEffect.mock.calls.length;
    const mountedGrandchildEffects = grandchildEffect.mock.calls.length;
    expect(mountedChildEffects).toBeGreaterThan(0);
    expect(mountedGrandchildEffects).toBeGreaterThan(0);

    root.getValue().setCount(5);
    await flushUpdates();
    expect(root.getValue().count).toBe(5);

    unsubscribe();
    await flushUpdates();
    expect(childCleanup).toHaveBeenCalledTimes(childEffect.mock.calls.length);
    expect(grandchildCleanup).toHaveBeenCalledTimes(
      grandchildEffect.mock.calls.length,
    );

    root.subscribe(() => {});
    expect(childEffect.mock.calls.length).toBeGreaterThan(mountedChildEffects);
    expect(grandchildEffect.mock.calls.length).toBeGreaterThan(
      mountedGrandchildEffects,
    );
    expect(root.getValue().count).toBe(5);
  });

  it("throws on unmount()", () => {
    const { root } = createCounterRoot();

    expect(() => root.unmount()).toThrow(
      "unmount() is not supported with mountOnSubscribe",
    );
  });
});
