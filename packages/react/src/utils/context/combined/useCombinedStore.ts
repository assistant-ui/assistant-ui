"use client";
import { useMemo } from "react";
import type { StoreApi } from "zustand";
import {
  type CombinedSelector,
  createCombinedStore,
} from "./createCombinedStore";

export const useCombinedStore = <T extends Array<unknown>, R>(
  stores: { [K in keyof T]: StoreApi<T[K]> },
  selector: CombinedSelector<T, R>,
): R => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: shallow-compare the store array
  const useCombined = useMemo(() => createCombinedStore<T, R>(stores), stores);
  return useCombined(selector);
};
