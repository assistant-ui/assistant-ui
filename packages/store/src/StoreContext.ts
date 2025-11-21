import {
  createContext,
  tapContext,
  withContextProvider,
} from "@assistant-ui/tap";
import type { EventManager } from "./EventContext";
import type { AssistantClient } from "./types";

export type StoreContextValue = {
  events: EventManager;
  parent: AssistantClient;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export const withStoreContextProvider = <TResult>(
  value: StoreContextValue,
  fn: () => TResult,
) => {
  return withContextProvider(StoreContext, value, fn);
};

export const tapStoreContext = () => {
  const ctx = tapContext(StoreContext);
  if (!ctx) throw new Error("Store context is not available");

  return ctx;
};
