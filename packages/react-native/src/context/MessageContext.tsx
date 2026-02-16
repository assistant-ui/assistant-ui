import { createContext, useContext, type ReactNode } from "react";
import type { MessageRuntime } from "@assistant-ui/core";

const MessageContext = createContext<MessageRuntime | null>(null);

export const useMessageRuntime = (): MessageRuntime => {
  const runtime = useContext(MessageContext);
  if (!runtime) {
    throw new Error("useMessageRuntime must be used within a MessageProvider");
  }
  return runtime;
};

export const MessageProvider = ({
  runtime,
  children,
}: {
  runtime: MessageRuntime;
  children: ReactNode;
}) => {
  return (
    <MessageContext.Provider value={runtime}>
      {children}
    </MessageContext.Provider>
  );
};
