import { describe, it, expect } from "vitest";
import { createResourceFiberRoot } from "../../core/helpers/root";
import {
  createResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
  unmountResourceFiber,
} from "../../core/ResourceFiber";
import { useEffect } from "../../react-hooks/useEffect";
import { useState } from "../../react-hooks/useState";

describe("render abort", () => {
  it("a stray commit after a throwing render does not consume the aborted render's work", () => {
    const events: string[] = [];
    const hook = (n: number, explode: boolean) => {
      useEffect(() => {
        events.push(`setup:${n}`);
        return () => events.push(`cleanup:${n}`);
      }, [n]);
      if (explode) throw new Error("boom");
      return n;
    };

    const root = createResourceFiberRoot(() => {});
    const fiber = createResourceFiber(hook, root, undefined, null);

    renderResourceFiber(fiber, [0, false]);
    commitResourceFiber(fiber);
    expect(events).toEqual(["setup:0"]);

    expect(() => renderResourceFiber(fiber, [1, true])).toThrow("boom");

    commitResourceFiber(fiber);
    expect(events).toEqual(["setup:0"]);

    renderResourceFiber(fiber, [2, false]);
    commitResourceFiber(fiber);
    expect(events).toEqual(["setup:0", "cleanup:0", "setup:2"]);
  });

  it("a throwing first render leaves the fiber unrendered and retryable", () => {
    const events: string[] = [];
    const hook = (explode: boolean) => {
      const [state] = useState(0);
      useEffect(() => {
        events.push("setup");
        return () => events.push("cleanup");
      }, []);
      if (explode) throw new Error("boom");
      return state;
    };

    const root = createResourceFiberRoot(() => {});
    const fiber = createResourceFiber(hook, root, undefined, null);

    expect(() => renderResourceFiber(fiber, [true])).toThrow("boom");

    commitResourceFiber(fiber);
    expect(events).toEqual([]);

    expect(renderResourceFiber(fiber, [false])).toBe(0);
    commitResourceFiber(fiber);
    expect(events).toEqual(["setup"]);

    unmountResourceFiber(fiber);
    expect(events).toEqual(["setup", "cleanup"]);
  });

  it("state applied before an aborted render survives to the retry", () => {
    const root = createResourceFiberRoot((evaluate, apply) => {
      if (!evaluate()) return;
      apply();
    });

    let setter!: (value: number) => void;
    let explode = false;
    const hook = () => {
      const [count, setCount] = useState(0);
      setter = setCount;
      if (explode && count === 1) throw new Error("boom");
      return count;
    };

    const fiber = createResourceFiber(hook, root, undefined, null);
    renderResourceFiber(fiber, []);
    commitResourceFiber(fiber);

    setter(1);
    explode = true;
    expect(() => renderResourceFiber(fiber, [])).toThrow("boom");

    explode = false;
    expect(renderResourceFiber(fiber, [])).toBe(1);
    commitResourceFiber(fiber);
    expect(renderResourceFiber(fiber, [])).toBe(1);
  });

  it("an undrained render-phase dispatch does not leak into the retry", () => {
    const root = createResourceFiberRoot(() => {});

    let explode = false;
    const hook = (bump: boolean) => {
      const [count, setCount] = useState(0);
      if (bump && count === 0) setCount(1);
      if (explode) throw new Error("boom");
      return count;
    };

    const fiber = createResourceFiber(hook, root, undefined, null);

    explode = true;
    expect(() => renderResourceFiber(fiber, [true])).toThrow("boom");

    explode = false;
    expect(renderResourceFiber(fiber, [false])).toBe(0);
    commitResourceFiber(fiber);
  });

  it("render-phase state drained before the abort survives to the retry", () => {
    const root = createResourceFiberRoot(() => {});

    let explode = false;
    const hook = (bump: boolean) => {
      const [count, setCount] = useState(0);
      if (bump && count === 0) setCount(1);
      if (explode && count === 1) throw new Error("boom");
      return count;
    };

    const fiber = createResourceFiber(hook, root, undefined, null);

    explode = true;
    expect(() => renderResourceFiber(fiber, [true])).toThrow("boom");

    explode = false;
    expect(renderResourceFiber(fiber, [false])).toBe(1);
    commitResourceFiber(fiber);
    expect(renderResourceFiber(fiber, [false])).toBe(1);
  });
});
