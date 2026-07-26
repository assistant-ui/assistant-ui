/* oxlint-disable react/rules-of-hooks, react-hooks/exhaustive-deps -- this module deliberately routes c() between tap and React at runtime */
import React from "react";
import {
  MEMO_CACHE_SENTINEL,
  createMemoCache,
} from "../core/helpers/memo-cache";

// Runtime drop-in for "react/compiler-runtime": React's c() resolves the live
// dispatcher's useMemoCache, so tapDispatcher's entry serves resource renders
// and React's own dispatcher serves component renders.
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

export const c = (size: number): unknown[] =>
  (ReactRuntime.__COMPILER_RUNTIME?.c ?? cPolyfill)(size);
