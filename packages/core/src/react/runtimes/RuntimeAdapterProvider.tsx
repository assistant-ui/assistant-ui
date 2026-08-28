import { type FC, type ReactNode, useContext, useMemo } from "react";
import type { RuntimeAdapters } from "../../runtimes/remote-thread-list/types";
import {
  RuntimeAdaptersContext,
  useRuntimeAdapters,
  useRuntimeAdaptersProvider,
} from "./useRuntimeAdapters";

export type { RuntimeAdapters };
export { useRuntimeAdapters, useRuntimeAdaptersProvider };

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
