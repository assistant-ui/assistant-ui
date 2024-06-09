import { useSyncExternalStore } from "react";
import type { StoreApi } from "zustand";

export type CombinedSelector<T extends Array<unknown>, R> = (...args: T) => R;

export const createCombinedStore = <T extends Array<unknown>, R>(
  stores: { [K in keyof T]: StoreApi<T[K]> },
) => {
  const subscribe = (callback: () => void): (() => void) => {
    const unsubscribes = stores.map((store) => store.subscribe(callback));
    return () => {
      for (const unsub of unsubscribes) {
        unsub();
      }
    };
  };

  return (selector: CombinedSelector<T, R>): R => {
    const getSnapshot = (): R =>
      selector(...(stores.map((store) => store.getState()) as T));

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  };
};
