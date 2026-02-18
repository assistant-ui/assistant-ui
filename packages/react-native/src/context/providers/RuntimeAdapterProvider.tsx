import { createContext, FC, ReactNode, useContext } from "react";
import type {
  ThreadHistoryAdapter,
  AttachmentAdapter,
} from "@assistant-ui/core";

export type RuntimeAdapters = {
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
  return (
    <RuntimeAdaptersContext.Provider
      value={{
        ...context,
        ...adapters,
      }}
    >
      {children}
    </RuntimeAdaptersContext.Provider>
  );
};

export const useRuntimeAdapters = () => {
  return useContext(RuntimeAdaptersContext);
};
