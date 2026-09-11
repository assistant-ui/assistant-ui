import { describe, it, expect } from "vitest";
import { createResourceFiberRoot } from "../../core/helpers/root";
import {
  createResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../../core/ResourceFiber";
import { use } from "../../react-hooks/use";
import { useEffect } from "../../react-hooks/useEffect";

const createFiber = <R>(hook: (...args: any[]) => R) => {
  const root = createResourceFiberRoot(() => {});
  return createResourceFiber(hook, root, undefined, null);
};

describe("use(thenable)", () => {
  it("suspends on a pending promise and resolves on retry", async () => {
    const promise = Promise.resolve(42);
    const hook = () => use(promise);
    const fiber = createFiber(hook);

    let thrown: unknown;
    try {
      renderResourceFiber(fiber, []);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(promise);

    await promise;
    expect(renderResourceFiber(fiber, [])).toBe(42);
  });

  it("returns synchronously from a userland-fulfilled thenable", () => {
    const thenable = {
      status: "fulfilled" as const,
      value: "sync",
      then: () => {},
    };
    const hook = () => use(thenable);
    const fiber = createFiber(hook);

    expect(renderResourceFiber(fiber, [])).toBe("sync");
  });

  it("returns synchronously from a thenable that settles while subscribing", () => {
    const thenable = {
      then: (onFulfilled: (value: string) => void) => {
        onFulfilled("sync-settle");
      },
    };
    const hook = () => use(thenable);
    const fiber = createFiber(hook);

    expect(renderResourceFiber(fiber, [])).toBe("sync-settle");
  });

  it("attaches handlers to a pre-stamped pending thenable", () => {
    let handlerCount = 0;
    const thenable = {
      status: "pending" as const,
      then: () => {
        handlerCount++;
      },
    };
    const hook = () => use(thenable);
    const fiber = createFiber(hook);

    expect(() => renderResourceFiber(fiber, [])).toThrow();
    expect(handlerCount).toBe(1);
  });

  it("throws the rejection reason once the promise rejects", async () => {
    const reason = new Error("denied");
    const promise = Promise.reject(reason);
    const hook = () => use(promise);
    const fiber = createFiber(hook);

    expect(() => renderResourceFiber(fiber, [])).toThrow();

    await promise.catch(() => {});
    expect(() => renderResourceFiber(fiber, [])).toThrow(reason);
  });

  it("a suspended render leaves no work behind and commits cleanly after retry", async () => {
    const events: string[] = [];
    const promise = Promise.resolve("ready");
    const hook = () => {
      const value = use(promise);
      useEffect(() => {
        events.push(`setup:${value}`);
        return () => events.push(`cleanup:${value}`);
      }, [value]);
      return value;
    };
    const fiber = createFiber(hook);

    expect(() => renderResourceFiber(fiber, [])).toThrow();
    commitResourceFiber(fiber);
    expect(events).toEqual([]);

    await promise;
    expect(renderResourceFiber(fiber, [])).toBe("ready");
    commitResourceFiber(fiber);
    expect(events).toEqual(["setup:ready"]);
  });

  it("suspending conditionally after other hooks preserves hook state", async () => {
    const events: string[] = [];
    let promise: Promise<string> | null = null;
    const hook = () => {
      useEffect(() => {
        events.push("setup");
      }, []);
      return promise === null ? "no-data" : use(promise);
    };
    const fiber = createFiber(hook);

    expect(renderResourceFiber(fiber, [])).toBe("no-data");
    commitResourceFiber(fiber);
    expect(events).toEqual(["setup"]);

    promise = Promise.resolve("data");
    expect(() => renderResourceFiber(fiber, [])).toThrow();

    await promise;
    expect(renderResourceFiber(fiber, [])).toBe("data");
    commitResourceFiber(fiber);
    expect(events).toEqual(["setup"]);
  });
});
