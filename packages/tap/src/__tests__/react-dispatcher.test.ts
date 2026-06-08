import { describe, it, expect, afterEach } from "vitest";
import * as React from "react";
// react/compiler-runtime exports `c` (= useMemoCache) at runtime but ships no types for it.
// @ts-expect-error -- runtime-only export
import { c as _c } from "react/compiler-runtime";
import { renderResourceFiber } from "../core/ResourceFiber";
import {
  createTestResource,
  renderTest,
  getCommittedOutput,
  cleanupAllResources,
  waitForNextTick,
} from "./test-utils";

// These resources author their hooks with the *real* `react` module (no shim, no
// build transform). tap's React dispatcher, installed around every resource body
// render, is what routes them to tap.
describe("react dispatcher", () => {
  afterEach(() => {
    cleanupAllResources();
  });

  it("routes React.useState to tap state", async () => {
    let set!: (n: number) => void;
    const fiber = createTestResource(() => {
      const [n, setN] = React.useState(10);
      set = setN;
      return n;
    });

    expect(renderTest(fiber, undefined)).toBe(10);
    set(42);
    await waitForNextTick();
    expect(getCommittedOutput(fiber)).toBe(42);
  });

  it("routes React.useMemo with deps memoization", () => {
    let runs = 0;
    const fiber = createTestResource((p: { x: number }) =>
      React.useMemo(() => {
        runs++;
        return p.x * 2;
      }, [p.x]),
    );

    expect(renderTest(fiber, { x: 2 })).toBe(4);
    expect(runs).toBe(1);
    renderTest(fiber, { x: 2 }); // same dep -> memoized
    expect(runs).toBe(1);
    expect(renderTest(fiber, { x: 3 })).toBe(6);
    expect(runs).toBe(2);
  });

  it("backs react/compiler-runtime's useMemoCache so compiled resources work", () => {
    const SENTINEL = Symbol.for("react.memo_cache_sentinel");
    const fiber = createTestResource(() => {
      // exactly what React Compiler emits: const $ = _c(n)
      const $ = _c(3);
      if ($[0] === SENTINEL) $[0] = "computed-once";
      return $[0];
    });

    expect(renderTest(fiber, undefined)).toBe("computed-once");
    // re-render: the cache persists across renders, slot already filled
    expect(renderTest(fiber, undefined)).toBe("computed-once");
  });

  it("throws for a hook tap does not implement", () => {
    const fiber = createTestResource(() => React.useId());
    // render directly: a mid-render throw must not leave a tracked, unmounted
    // fiber for `cleanupAllResources` to choke on.
    expect(() => renderResourceFiber(fiber, undefined)).toThrow();
  });
});
