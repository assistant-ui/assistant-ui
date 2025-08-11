import { ReactNode, useContext, useMemo } from "react";
import { AssistantContext } from "../assistant/AssistantContext";
import { mapStore } from "../../utils/store/mapStore";
import { MessageContext } from "./MessageContext";

export namespace MessageProvider {
  export interface Props {
    readonly messageIdx: number;
    readonly children: ReactNode;
  }
}

export const MessageProvider = ({
  messageIdx,
  children,
}: MessageProvider.Props) => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("MessageProvider must be used within an AssistantProvider");
  }

  const message = useMemo(() => {
    return mapStore(context, (state) => state.thread.messages[messageIdx]!);
  }, [context, messageIdx]);

  return (
    <MessageContext.Provider value={message}>
      {children}
    </MessageContext.Provider>
  );
};
