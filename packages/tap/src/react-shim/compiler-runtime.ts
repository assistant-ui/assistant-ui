/* oxlint-disable react/rules-of-hooks, react-hooks/exhaustive-deps -- this module deliberately routes c() between tap and React at runtime */
import React from "react";
import { isDevelopment } from "../core/helpers/env";
import { peekResourceFiber } from "../core/helpers/execution-context";

// Runtime drop-in for "react/compiler-runtime": React Compiler output calls
// `c(size)` for its memo cache. Alias `react/compiler-runtime` to this module
// so compiled resource bodies use tap's cache while ordinary React components
// use React's runtime.
const ReactRuntime = React as any;

// React 18 lacks `__COMPILER_RUNTIME`, so mirror Meta's compiler-runtime
// polyfill: a once-per-mount memo cell.
const MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
const createMemoCache = (size: number): unknown[] =>
  new Array(size).fill(MEMO_CACHE_SENTINEL);

const cPolyfill = (size: number): unknown[] =>
  ReactRuntime.useMemo(() => {
    const $ = createMemoCache(size);
    // tells react devtools this array is a memo cache
    ($ as any)[MEMO_CACHE_SENTINEL] = true;
    return $;
  }, []);

export const c = (size: number): unknown[] => {
  const fiber = peekResourceFiber();
  if (fiber === null) {
    return (ReactRuntime.__COMPILER_RUNTIME?.c ?? cPolyfill)(size);
  }

  const memoCache = fiber.memoCache;
  let data = memoCache.workInProgress;

  if (data === null) {
    const current = memoCache.current;
    data = current === null ? [] : current.map((array) => array.slice());
    memoCache.workInProgress = data;
  }

  const index = memoCache.index++;
  let cache = data[index];
  if (cache === undefined) {
    cache = createMemoCache(size);
    data[index] = cache;
  } else if (isDevelopment && cache.length !== size) {
    console.error(
      "Expected a constant size argument for each invocation of c(). " +
        "The previous cache was allocated with size " +
        `${cache.length} but size ${size} was requested.`,
    );
  }

  return cache;
};
