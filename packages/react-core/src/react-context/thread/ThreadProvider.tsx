import { ReactNode, useContext, useMemo } from "react";
import { mapStore } from "../../utils/store/mapStore";
import { ThreadContext } from "./ThreadContext";
import { AssistantContext } from "../assistant/AssistantContext";

export namespace ThreadProvider {
  export interface Props {
    readonly children: ReactNode;
  }
}

export const ThreadProvider = ({ children }: ThreadProvider.Props) => {
  const client = useContext(AssistantContext);
  if (!client) {
    throw new Error("ThreadProvider must be used within an AssistantProvider");
  }

  const thread = useMemo(() => {
    return mapStore(client, (state) => state.thread);
  }, [client]);

  return (
    <ThreadContext.Provider value={thread}>{children}</ThreadContext.Provider>
  );
};
