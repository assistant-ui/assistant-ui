import { useReducerWithDerivedState } from "./useReducer";

const MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");

/**
 * Backs React Compiler's memo cache. Compiled output allocates it through
 * `react/compiler-runtime`'s `c(size)` (`ReactSharedInternals.H.useMemoCache(size)`);
 * a tap ref persists the array so compiled resources run without `"use no memo"`.
 */
export const useMemoCache = (size: number): unknown[] => {
  // clone the memo value once per render
  let cloned = false;
  const [cache] = useReducerWithDerivedState(
    () => [] as unknown[],
    (arr) => {
      if (cloned) return arr;
      cloned = true;
      return [...arr];
    },
    size,
    (length) => Array.from({ length }).fill(MEMO_CACHE_SENTINEL),
  );

  return cache;
};
