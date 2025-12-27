import { createContext, useContext, FC, PropsWithChildren } from "react";
import type { Unsubscribe, ThreadMessage } from "@assistant-ui/core";

export type MessageRuntimeState = {
  message: ThreadMessage;
  parentId: string | null;
  branchNumber: number;
  branchCount: number;
  isLast: boolean;
};

export type MessageRuntime = {
  getState: () => MessageRuntimeState;
  subscribe: (callback: () => void) => Unsubscribe;
  reload: () => void;
  speak: () => void;
  stopSpeaking: () => void;
  submitFeedback: (feedback: { type: "positive" | "negative" }) => void;
  switchToBranch: (options: {
    position?: "previous" | "next";
    branchId?: string;
  }) => void;
};

const MessageContext = createContext<MessageRuntime | null>(null);

export const useMessageContext = (): MessageRuntime => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessageContext must be used within a MessageProvider");
  }
  return context;
};

export const useMessageContextOptional = (): MessageRuntime | null => {
  return useContext(MessageContext);
};

export type MessageProviderProps = PropsWithChildren<{
  runtime: MessageRuntime;
}>;

export const MessageProvider: FC<MessageProviderProps> = ({
  runtime,
  children,
}) => {
  return (
    <MessageContext.Provider value={runtime}>
      {children}
    </MessageContext.Provider>
  );
};
