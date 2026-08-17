import { createContext, useContext } from "react";
import { useContextProvider } from "@assistant-ui/tap";
import type { RemoteThreadListAdapters } from "../../runtimes/remote-thread-list/types";

export type RuntimeAdapters = RemoteThreadListAdapters;

const RuntimeAdaptersContext = createContext<RuntimeAdapters | null>(null);

export const useRuntimeAdaptersProvider = <T>(
  adapters: RuntimeAdapters | null,
  fn: () => T,
): T => useContextProvider(RuntimeAdaptersContext, adapters, fn);

export const useRuntimeAdapters = () => {
  return useContext(RuntimeAdaptersContext);
};

export { RuntimeAdaptersContext };
