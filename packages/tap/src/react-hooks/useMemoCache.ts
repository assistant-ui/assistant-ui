import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { nextFiberMemoCache } from "../core/helpers/memo-cache";

export const useMemoCache = (size: number): unknown[] =>
  nextFiberMemoCache(getCurrentResourceFiber(), size);
