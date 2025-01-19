import { createContext, FC, useContext } from "react";
import { ThreadHistoryAdapter } from "./thread-history/ThreadHistoryAdapter";

export type RuntimeAdapters = {
  history: ThreadHistoryAdapter;
};

const RuntimeAdaptersContext = createContext<RuntimeAdapters | null>(null);

namespace RuntimeAdapterProvider {
  export type Props = {
    adapters: RuntimeAdapters;
    children: React.ReactNode;
  };
}

export const RuntimeAdapterProvider: FC<RuntimeAdapterProvider.Props> = ({
  adapters,
  children,
}) => {
  return (
    <RuntimeAdaptersContext.Provider value={adapters}>
      {children}
    </RuntimeAdaptersContext.Provider>
  );
};

export const useRuntimeAdapters = () => {
  const adapters = useContext(RuntimeAdaptersContext);
  return adapters;
};
