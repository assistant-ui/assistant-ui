import type { StoreApi, UseBoundStore } from "zustand";

export type ReadonlyStore<T> = UseBoundStore<
  Omit<StoreApi<T>, "setState" | "destroy">
>;

export const writableStore = <T>(store: ReadonlyStore<T> | undefined) => {
  return store as unknown as UseBoundStore<StoreApi<T>>;
};
