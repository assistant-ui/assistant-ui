/* oxlint-disable react/rules-of-hooks, react-hooks/exhaustive-deps -- this module deliberately routes c() between tap and React at runtime */
import React from "react";
import {
  MEMO_CACHE_SENTINEL,
  createMemoCache,
  nextFiberMemoCache,
} from "../core/helpers/memo-cache";
import { peekResourceFiber } from "../core/helpers/execution-context";

// Runtime drop-in for "react/compiler-runtime": React Compiler output calls
// `c(size)` for its memo cache. Alias `react/compiler-runtime` to this module
// so compiled resource bodies use tap's cache while ordinary React components
// use React's runtime.
const ReactRuntime = React as any;

// React 18 lacks `__COMPILER_RUNTIME`, so mirror Meta's compiler-runtime
// polyfill: a once-per-mount memo cell.
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

  return nextFiberMemoCache(fiber, size);
};
