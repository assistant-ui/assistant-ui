import type { ResourceFiber } from "../types";
import { isDevelopment } from "./env";

export const MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");

export const createMemoCache = (size: number): unknown[] =>
  new Array(size).fill(MEMO_CACHE_SENTINEL);

export const nextFiberMemoCache = (
  fiber: ResourceFiber<unknown>,
  size: number,
): unknown[] => {
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
