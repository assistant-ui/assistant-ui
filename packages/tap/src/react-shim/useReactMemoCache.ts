/* oxlint-disable react/exhaustive-deps -- once-per-mount memo cell */
import React, { useMemo } from "react";
import {
  MEMO_CACHE_SENTINEL,
  createMemoCache,
} from "../react-hooks/useMemoCache";

const ReactRuntime = React as any;

// Mirror of Meta's compiler-runtime polyfill for React builds without a
// native memo cache: a once-per-mount memo cell.
export const useReactMemoCacheShim = (size: number): unknown[] =>
  useMemo(() => {
    const $ = createMemoCache(size);
    // tells react devtools this array is a memo cache
    ($ as any)[MEMO_CACHE_SENTINEL] = true;
    return $;
  }, []);

export const reactC: (size: number) => unknown[] =
  ReactRuntime.__COMPILER_RUNTIME?.c ?? useReactMemoCacheShim;
