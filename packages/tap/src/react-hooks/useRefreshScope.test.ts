/* oxlint-disable react-hooks/exhaustive-deps -- Refresh tests require stale closures with unchanged dependencies. */
import { useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanupAllResources,
  createTestResource,
  renderTest,
} from "../__tests__/test-utils";
import {
  commitResourceFiber,
  discardWipRender,
  renderResourceFiber,
} from "../core/ResourceFiber";
import { setRootVersion } from "../core/helpers/root";
import { resource } from "../core/resource";
import type { ResourceElement } from "../core/types";
import { withKey } from "../core/withKey";
import { useResource } from "../hooks/useResource";
import { useResources } from "../hooks/useResources";
import { useRefreshScope } from "../internal";
import { useCallback } from "./useCallback";
import { useEffect } from "./useEffect";
import { useEffectEvent } from "./useEffectEvent";
import { useId } from "./useId";
import { useInsertionEffect } from "./useInsertionEffect";
import { useMemo } from "./useMemo";
import { MEMO_CACHE_SENTINEL, useMemoCache } from "./useMemoCache";
import { useReducer } from "./useReducer";
import { useRef } from "./useRef";
import { useState } from "./useState";

afterEach(cleanupAllResources);

describe.each([
  [
    "useResource",
    function useChild<T>(elements: readonly ResourceElement<T>[]) {
      return useResource(elements[0]!);
    },
  ],
  [
    "useResources",
    function useChild<T>(elements: readonly ResourceElement<T>[]) {
      return useResources(elements)[0]!;
    },
  ],
] as const)("%s in refresh scopes", (_, useChild) => {
  it("refreshes equal-dependency descendants only when the parent token changes", () => {
    let value = "old";
    const render = vi.fn();
    const factory = vi.fn(() => ({ value }));
    const cacheFactory = vi.fn(() => ({ value }));
    const events: string[] = [];
    const Leaf = resource(function useLeaf() {
      render();
      const memo = useMemo(factory, []);
      const cache = useMemoCache(1);
      if (cache[0] === MEMO_CACHE_SENTINEL) cache[0] = cacheFactory();
      const [state] = useState(() => ({}));
      const ref = useRef({});
      const currentValue = value;
      useEffect(() => {
        events.push(`setup ${currentValue}`);
        return () => events.push(`cleanup ${currentValue}`);
      }, []);
      return { memo, cached: cache[0], state, ref };
    });
    const leaves = [withKey("leaf", Leaf(), [])];
    const Child = resource(function useNestedChild() {
      return useChild(leaves);
    });
    const children = [withKey("child", Child(), [])];
    const fiber = createTestResource((token: number) => {
      const outside = useChild(leaves);
      const inside = useRefreshScope(token, () => useChild(children));
      const after = useChild(leaves);
      return { outside, inside, after };
    });

    const first = renderTest(fiber, 0);
    expect(renderTest(fiber, 0)).toEqual(first);
    expect(render).toHaveBeenCalledTimes(3);
    expect(factory).toHaveBeenCalledTimes(3);
    expect(cacheFactory).toHaveBeenCalledTimes(3);
    expect(events).toEqual(["setup old", "setup old", "setup old"]);

    value = "new";
    const next = renderResourceFiber(fiber, [1]);
    expect(render).toHaveBeenCalledTimes(4);
    expect(factory).toHaveBeenCalledTimes(4);
    expect(cacheFactory).toHaveBeenCalledTimes(4);
    expect(next.inside.memo).toEqual({ value: "new" });
    expect(next.inside.cached).toEqual({ value: "new" });
    expect(next.inside.state).toBe(first.inside.state);
    expect(next.inside.ref).toBe(first.inside.ref);
    expect(next.outside).toBe(first.outside);
    expect(next.after).toBe(first.after);
    expect(events).toEqual(["setup old", "setup old", "setup old"]);

    commitResourceFiber(fiber);
    expect(events).toEqual([
      "setup old",
      "setup old",
      "setup old",
      "cleanup old",
      "setup new",
    ]);
    commitResourceFiber(fiber);
    expect(renderTest(fiber, 1)).toEqual(next);
    expect(render).toHaveBeenCalledTimes(4);
    expect(events).toHaveLength(5);
  });

  it.each(["discard", "rollback", "throw"])(
    "commits no abandoned nested refresh after %s",
    (mode) => {
      let value = "old";
      let fail = false;
      const factory = vi.fn(() => ({ value }));
      const cacheFactory = vi.fn(() => ({ value }));
      const events: string[] = [];
      const Child = resource(function useNestedChild() {
        const memo = useMemo(factory, []);
        const cache = useMemoCache(1);
        if (cache[0] === MEMO_CACHE_SENTINEL) cache[0] = cacheFactory();
        const currentValue = value;
        useEffect(() => {
          events.push(`setup ${currentValue}`);
          return () => events.push(`cleanup ${currentValue}`);
        }, []);
        if (fail) throw new Error("Child failed");
        return { memo, cached: cache[0] };
      });
      const children = [withKey("child", Child(), [])];
      const fiber = createTestResource((token: number) =>
        useRefreshScope(token, () => useChild(children)),
      );

      const first = renderTest(fiber, 0);
      setRootVersion(fiber.root, 1);
      value = "abandoned";
      if (mode === "throw") {
        fail = true;
        expect(() => renderResourceFiber(fiber, [1])).toThrow("Child failed");
        fail = false;
      } else {
        expect(renderResourceFiber(fiber, [1])).toEqual({
          memo: { value: "abandoned" },
          cached: { value: "abandoned" },
        });
      }
      if (mode === "rollback") setRootVersion(fiber.root, 0);
      discardWipRender(fiber);
      commitResourceFiber(fiber);
      expect(events).toEqual(["setup old"]);
      expect(factory).toHaveBeenCalledTimes(2);
      expect(cacheFactory).toHaveBeenCalledTimes(2);

      expect(renderTest(fiber, 0)).toBe(first);
      expect(events).toEqual(["setup old"]);
      expect(factory).toHaveBeenCalledTimes(2);
      expect(cacheFactory).toHaveBeenCalledTimes(2);

      value = "new";
      const next = renderTest(fiber, 1);
      expect(next).toEqual({
        memo: { value: "new" },
        cached: { value: "new" },
      });
      expect(factory).toHaveBeenCalledTimes(3);
      expect(cacheFactory).toHaveBeenCalledTimes(3);
      expect(events).toEqual(["setup old", "cleanup old", "setup new"]);
      expect(renderTest(fiber, 1)).toBe(next);
      expect(factory).toHaveBeenCalledTimes(3);
      expect(cacheFactory).toHaveBeenCalledTimes(3);
      expect(events).toHaveLength(3);
    },
  );
});

describe("useRefreshScope", () => {
  it("does not recompute or replay effects for an unchanged token", () => {
    const factory = vi.fn(() => ({}));
    const setup = vi.fn();
    const cleanup = vi.fn();
    const fiber = createTestResource((token: unknown) =>
      useRefreshScope(token, () => {
        const memo = useMemo(factory, []);
        const callback = useCallback(() => "unchanged", []);
        useEffect(() => {
          setup();
          return cleanup;
        }, []);
        return { memo, callback };
      }),
    );
    const token = {};

    const first = renderTest(fiber, token);
    const next = renderTest(fiber, token);

    expect(next.memo).toBe(first.memo);
    expect(next.callback).toBe(first.callback);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("refreshes equal-dependency memos and callbacks with the current closure", () => {
    const factory = vi.fn((path: string) => ({ path }));
    const send = vi.fn();
    const fiber = createTestResource((token: number, path: string) =>
      useRefreshScope(token, () => ({
        memo: useMemo(() => factory(path), []),
        callback: useCallback(() => send(path), []),
      })),
    );

    const first = renderTest(fiber, 0, "/old");
    first.callback();
    const next = renderTest(fiber, 1, "/new");
    next.callback();

    expect(next.memo).toEqual({ path: "/new" });
    expect(next.memo).not.toBe(first.memo);
    expect(next.callback).not.toBe(first.callback);
    expect(send.mock.calls).toEqual([["/old"], ["/new"]]);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(renderTest(fiber, 1, "/ignored")).toEqual(next);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["passive", useEffect],
    ["layout", useLayoutEffect],
    ["insertion", useInsertionEffect],
  ] as const)("replays %s effects once at commit", (_, useTestEffect) => {
    const events: string[] = [];
    const fiber = createTestResource((token: number, value: string) =>
      useRefreshScope(token, () => {
        useTestEffect(() => {
          events.push(`setup ${value}`);
          return () => {
            events.push(`cleanup ${value}`);
          };
        }, []);
      }),
    );

    renderTest(fiber, 0, "old");
    renderTest(fiber, 0, "unchanged");
    expect(events).toEqual(["setup old"]);

    renderResourceFiber(fiber, [1, "new"]);
    expect(events).toEqual(["setup old"]);
    commitResourceFiber(fiber);
    expect(events).toEqual(["setup old", "cleanup old", "setup new"]);

    commitResourceFiber(fiber);
    renderTest(fiber, 1, "unchanged");
    expect(events).toEqual(["setup old", "cleanup old", "setup new"]);
  });

  it("preserves refs, ids, state and reducers across refresh", () => {
    const initialize = vi.fn(() => 1);
    const fiber = createTestResource((token: number) =>
      useRefreshScope(token, () => {
        const ref = useRef("initial");
        const id = useId();
        const [state, setState] = useState(initialize);
        const [count, increment] = useReducer((n: number) => n + 1, 0);
        return { ref, id, state, setState, count, increment };
      }),
    );

    const first = renderTest(fiber, 0);
    first.ref.current = "retained";
    first.setState(7);
    first.increment();
    const next = renderTest(fiber, 1);

    expect(next.ref).toBe(first.ref);
    expect(next.ref.current).toBe("retained");
    expect(next.id).toBe(first.id);
    expect(next.state).toBe(7);
    expect(next.count).toBe(1);
    expect(next.setState).toBe(first.setState);
    expect(next.increment).toBe(first.increment);
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it("keeps effect event identity and publishes its callback only on commit", () => {
    const fiber = createTestResource((token: number, value: string) =>
      useRefreshScope(token, () => {
        const event = useEffectEvent(() => value);
        return event;
      }),
    );

    const event = renderTest(fiber, 0, "old");
    expect(renderResourceFiber(fiber, [1, "discarded"])).toBe(event);
    expect(event()).toBe("old");
    discardWipRender(fiber);
    commitResourceFiber(fiber);
    expect(event()).toBe("old");

    expect(renderResourceFiber(fiber, [1, "new"])).toBe(event);
    expect(event()).toBe("old");
    commitResourceFiber(fiber);
    expect(event()).toBe("new");

    expect(renderTest(fiber, 1, "latest")).toBe(event);
    expect(event()).toBe("latest");
  });

  it("resets only memo caches visited by the refreshing scope", () => {
    const insideFactory = vi.fn(() => ({}));
    const outsideFactory = vi.fn(() => ({}));
    const fiber = createTestResource((token: number) => {
      const before = useMemoCache(1);
      if (before[0] === MEMO_CACHE_SENTINEL) before[0] = outsideFactory();
      const inside = useRefreshScope(token, () => {
        const cache = useMemoCache(1);
        if (cache[0] === MEMO_CACHE_SENTINEL) cache[0] = insideFactory();
        const second = useMemoCache(1);
        if (second[0] === MEMO_CACHE_SENTINEL) second[0] = insideFactory();
        return [cache[0], second[0]];
      });
      const after = useMemoCache(1);
      if (after[0] === MEMO_CACHE_SENTINEL) after[0] = outsideFactory();
      return { before: before[0], inside, after: after[0] };
    });

    const first = renderTest(fiber, 0);
    expect(renderTest(fiber, 0)).toEqual(first);
    expect(insideFactory).toHaveBeenCalledTimes(2);
    expect(outsideFactory).toHaveBeenCalledTimes(2);
    const next = renderTest(fiber, 1);

    expect(next.before).toBe(first.before);
    expect(next.after).toBe(first.after);
    expect(next.inside[0]).not.toBe(first.inside[0]);
    expect(next.inside[1]).not.toBe(first.inside[1]);
    expect(insideFactory).toHaveBeenCalledTimes(4);
    expect(outsideFactory).toHaveBeenCalledTimes(2);
    expect(renderTest(fiber, 1)).toEqual(next);
    expect(insideFactory).toHaveBeenCalledTimes(4);
  });

  it.each(["discard", "rollback"])(
    "retries an uncommitted refresh after %s without replaying abandoned effects",
    (mode) => {
      const factory = vi.fn((value: string) => ({ value }));
      const cacheFactory = vi.fn((value: string) => ({ value }));
      const events: string[] = [];
      const fiber = createTestResource((token: number, value: string) =>
        useRefreshScope(token, () => {
          const memo = useMemo(() => factory(value), []);
          const cache = useMemoCache(1);
          if (cache[0] === MEMO_CACHE_SENTINEL) cache[0] = cacheFactory(value);
          useEffect(() => {
            events.push(`setup ${value}`);
            return () => events.push(`cleanup ${value}`);
          }, []);
          return { memo, cached: cache[0] };
        }),
      );

      const first = renderTest(fiber, 0, "old");
      setRootVersion(fiber.root, 1);
      const abandoned = renderResourceFiber(fiber, [1, "abandoned"]);
      if (mode === "rollback") setRootVersion(fiber.root, 0);
      discardWipRender(fiber);
      commitResourceFiber(fiber);
      expect(events).toEqual(["setup old"]);

      if (mode === "rollback") {
        expect(renderTest(fiber, 0, "old")).toEqual(first);
        expect(factory).toHaveBeenCalledTimes(2);
        expect(cacheFactory).toHaveBeenCalledTimes(2);
      }

      const next = renderTest(fiber, 1, "new");
      expect(next.memo).toEqual({ value: "new" });
      expect(next.cached).toEqual({ value: "new" });
      expect(next.memo).not.toBe(abandoned.memo);
      expect(next.cached).not.toBe(abandoned.cached);
      expect(factory).toHaveBeenCalledTimes(3);
      expect(cacheFactory).toHaveBeenCalledTimes(3);
      expect(events).toEqual(["setup old", "cleanup old", "setup new"]);
      expect(renderTest(fiber, 1, "ignored")).toEqual(next);
      expect(factory).toHaveBeenCalledTimes(3);
      expect(cacheFactory).toHaveBeenCalledTimes(3);
    },
  );

  it("does not refresh before the scope's first committed token", () => {
    const factory = vi.fn(() => ({}));
    const fiber = createTestResource((token: unknown) =>
      useRefreshScope(token, () => useMemo(factory, [])),
    );

    const first = renderResourceFiber(fiber, ["uncommitted"]);
    discardWipRender(fiber);
    expect(renderTest(fiber, undefined)).toBe(first);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(renderTest(fiber, "new")).not.toBe(first);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("compares committed tokens with Object.is", () => {
    const factory = vi.fn(() => ({}));
    const fiber = createTestResource((token: unknown) =>
      useRefreshScope(token, () => useMemo(factory, [])),
    );

    const first = renderTest(fiber, NaN);
    expect(renderTest(fiber, NaN)).toBe(first);
    const zero = renderTest(fiber, 0);
    expect(zero).not.toBe(first);
    const negativeZero = renderTest(fiber, -0);
    expect(negativeZero).not.toBe(zero);
    const token = {};
    const object = renderTest(fiber, token);
    expect(object).not.toBe(negativeZero);
    expect(renderTest(fiber, token)).toBe(object);
    expect(renderTest(fiber, {})).not.toBe(object);
    expect(factory).toHaveBeenCalledTimes(5);
  });

  it("restores the enclosing scope after a nested scope returns or throws", () => {
    const insideFactory = vi.fn(() => ({}));
    const outsideFactory = vi.fn(() => ({}));
    const setup = vi.fn();
    const cleanup = vi.fn();
    const failure = new Error("Scope failed");
    const fiber = createTestResource((token: number, fail: boolean) => {
      const before = useMemo(outsideFactory, []);
      try {
        useRefreshScope(token, () => {
          useRefreshScope("unchanged", () => useMemo(insideFactory, []));
          useMemo(insideFactory, []);
          if (fail) throw failure;
        });
      } catch (error) {
        expect(error).toBe(failure);
      }
      const after = useMemo(outsideFactory, []);
      useEffect(() => {
        setup();
        return cleanup;
      }, []);
      return { before, after };
    });

    const first = renderTest(fiber, 0, false);
    expect(renderTest(fiber, 1, false)).toEqual(first);
    expect(renderTest(fiber, 2, true)).toEqual(first);
    expect(insideFactory).toHaveBeenCalledTimes(6);
    expect(outsideFactory).toHaveBeenCalledTimes(2);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("retries a throwing refresh without committing its token or effects", () => {
    const factory = vi.fn(() => ({}));
    const setup = vi.fn();
    const cleanup = vi.fn();
    const fiber = createTestResource((token: number, fail: boolean) =>
      useRefreshScope(token, () => {
        const memo = useMemo(factory, []);
        useEffect(() => {
          setup();
          return cleanup;
        }, []);
        if (fail) throw new Error("Render failed");
        return memo;
      }),
    );

    renderTest(fiber, 0, false);
    expect(() => renderResourceFiber(fiber, [1, true])).toThrow(
      "Render failed",
    );
    commitResourceFiber(fiber);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();
    renderTest(fiber, 1, false);
    expect(factory).toHaveBeenCalledTimes(3);
    expect(setup).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("throws the hook order error when a hook is inserted during refresh", () => {
    const fiber = createTestResource((token: number) =>
      useRefreshScope(token, () => {
        if (token !== 0) useState(0);
        return useMemo(() => ({}), []);
      }),
    );

    renderTest(fiber, 0);
    expect(() => renderResourceFiber(fiber, [1])).toThrow(
      "Hook order changed between renders",
    );
  });
});
