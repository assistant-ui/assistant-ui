import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useMemo,
} from "react";
import { useContextProvider } from "@assistant-ui/tap";
import type { RemoteThreadListAdapters } from "../../runtimes/remote-thread-list/types";

export type RuntimeAdapters = RemoteThreadListAdapters;

const RuntimeAdaptersContext = createContext<RuntimeAdapters | null>(null);

export const useRuntimeAdaptersProvider = <T,>(
  adapters: RuntimeAdapters | null,
  fn: () => T,
): T => useContextProvider(RuntimeAdaptersContext, adapters, fn);

export namespace RuntimeAdapterProvider {
  export type Props = {
    adapters: RuntimeAdapters;
    children: ReactNode;
  };
}

export const RuntimeAdapterProvider: FC<RuntimeAdapterProvider.Props> = ({
  adapters,
  children,
}) => {
  const context = useContext(RuntimeAdaptersContext);
  const value = useMemo(
    () => ({ ...context, ...adapters }),
    [context, adapters],
  );
  return (
    <RuntimeAdaptersContext.Provider value={value}>
      {children}
    </RuntimeAdaptersContext.Provider>
  );
};

export const useRuntimeAdapters = () => {
  return useContext(RuntimeAdaptersContext);
};
