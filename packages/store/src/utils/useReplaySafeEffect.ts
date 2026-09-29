import { useEffect, useState } from "react";

type Setup = {
  deps: readonly unknown[];
  cleanup: (() => void) | void;
};

const depsEqual = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length &&
  a.every((value, index) => Object.is(value, b[index]));

/** `useEffect` for a teardown that must survive a replay. Fast Refresh and a StrictMode double mount run an effect's cleanup and then its setup in the same tick with unchanged deps; both are skipped, so the work the effect started keeps running. A deps change still runs the old cleanup before the new setup, and an unmount or a hidden `<Activity>` runs the cleanup one microtask later. */
export const useReplaySafeEffect = (
  effect: () => (() => void) | void,
  deps: readonly unknown[],
): void => {
  const [cell] = useState<{ pending: Setup | undefined }>(() => ({
    pending: undefined,
  }));

  useEffect(() => {
    const pending = cell.pending;
    cell.pending = undefined;
    let current: Setup;
    if (pending !== undefined && depsEqual(pending.deps, deps)) {
      current = pending;
    } else {
      pending?.cleanup?.();
      current = { deps, cleanup: effect() };
    }
    return () => {
      cell.pending = current;
      queueMicrotask(() => {
        if (cell.pending !== current) return;
        cell.pending = undefined;
        current.cleanup?.();
      });
    };
    // oxlint-disable-next-line react/exhaustive-deps -- the caller's deps array is the effect's deps
  }, deps);
};
