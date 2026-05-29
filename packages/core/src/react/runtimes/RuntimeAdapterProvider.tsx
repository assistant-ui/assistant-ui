import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useMemo,
} from "react";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { ModelContextProvider } from "../../model-context/types";

export type RuntimeAdapters = {
  modelContext?: ModelContextProvider | undefined;
  history?: ThreadHistoryAdapter | undefined;
  attachments?: AttachmentAdapter | undefined;
};

const RuntimeAdaptersContext = createContext<RuntimeAdapters | null>(null);

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
