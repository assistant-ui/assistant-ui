import { describe, it, expect, afterEach } from "vitest";
import * as React from "react";
import {
  commitResourceFiber,
  renderResourceFiber,
} from "../core/ResourceFiber";
import { setRootVersion } from "../core/helpers/root";
import type { MemoCell } from "../core/types";
import {
  createTestResource,
  renderTest,
  getCommittedValue,
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

    expect(renderTest(fiber)).toBe(10);
    set(42);
    await waitForNextTick();
    expect(getCommittedValue(fiber)).toBe(42);
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

  it("rolls back React.useMemo work from discarded root versions", () => {
    let runs = 0;
    const fiber = createTestResource((p: { x: number }) =>
      React.useMemo(
        () => ({
          run: ++runs,
          value: p.x,
        }),
        [p.x],
      ),
    );

    expect(renderTest(fiber, { x: 1 })).toEqual({ run: 1, value: 1 });

    setRootVersion(fiber.root, 1);
    expect(renderResourceFiber(fiber, [{ x: 2 }])).toEqual({
      run: 2,
      value: 2,
    });

    setRootVersion(fiber.root, 0);
    expect(renderTest(fiber, { x: 2 })).toEqual({ run: 3, value: 2 });
  });

  it("commits React.useMemo work from a replayed render", () => {
    let runs = 0;
    const fiber = createTestResource((p: { x: number }) =>
      React.useMemo(
        () => ({
          run: ++runs,
          value: p.x,
        }),
        [p.x],
      ),
    );

    expect(renderTest(fiber, { x: 1 })).toEqual({ run: 1, value: 1 });

    expect(renderResourceFiber(fiber, [{ x: 2 }])).toEqual({
      run: 2,
      value: 2,
    });
    const replayed = renderResourceFiber(fiber, [{ x: 2 }]);
    commitResourceFiber(fiber);

    const cell = fiber.cells[0] as MemoCell;
    expect(cell.isDirty).toBe(false);
    expect(cell.current).toBe(replayed);
    expect(cell.currentDeps).toEqual([2]);
  });

  // A duplicated tap copy misses its own shim fiber and falls through to
  // React's c(), which reads useMemoCache off the live dispatcher.
  // React 18 has no __COMPILER_RUNTIME.
  it.skipIf(!(React as any).__COMPILER_RUNTIME)(
    "routes React's __COMPILER_RUNTIME.c to the tap fiber's memo cache",
    () => {
      const runtimeC = (React as any).__COMPILER_RUNTIME.c;
      let computes = 0;
      const fiber = createTestResource((p: { x: number }) => {
        const $ = runtimeC(2);
        let double;
        if ($[0] !== p.x) {
          computes++;
          double = p.x * 2;
          $[0] = p.x;
          $[1] = double;
        } else {
          double = $[1];
        }
        return double;
      });

      expect(renderTest(fiber, { x: 2 })).toBe(4);
      expect(computes).toBe(1);
      expect(renderTest(fiber, { x: 2 })).toBe(4);
      expect(computes).toBe(1);
      expect(renderTest(fiber, { x: 3 })).toBe(6);
      expect(computes).toBe(2);
    },
  );

  it("throws for a hook tap does not implement", () => {
    const fiber = createTestResource(() => React.useId());
    // render directly: a mid-render throw must not leave a tracked, unmounted
    // fiber for `cleanupAllResources` to choke on.
    expect(() => renderResourceFiber(fiber, [])).toThrow();
  });
});
