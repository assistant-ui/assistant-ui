import type { StoreApi, UseBoundStore } from "zustand";

export type ReadonlyStore<T> = UseBoundStore<
  Omit<StoreApi<T>, "setState" | "destroy" | "getInitialState">
>;
