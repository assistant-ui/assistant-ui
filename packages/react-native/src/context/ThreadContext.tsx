import { createContext, useContext, FC, PropsWithChildren } from "react";
import type { Unsubscribe } from "@assistant-ui/core";

export type ThreadRuntimeState = {
  threadId: string;
  isRunning: boolean;
  isDisabled: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  messages: readonly unknown[];
  capabilities: ThreadCapabilities;
};

export type ThreadCapabilities = {
  switchToBranch: boolean;
  edit: boolean;
  reload: boolean;
  cancel: boolean;
  unstable_copy: boolean;
  speech: boolean;
  attachments: boolean;
  feedback: boolean;
};

export type ThreadRuntime = {
  getState: () => ThreadRuntimeState;
  subscribe: (callback: () => void) => Unsubscribe;
  append: (message: AppendMessage) => void;
  startRun: (parentId: string | null) => void;
  cancelRun: () => void;
};

export type AppendMessage = {
  role: "user" | "assistant";
  content: readonly { type: string; text?: string }[];
  parentId?: string | null;
};

const ThreadContext = createContext<ThreadRuntime | null>(null);

export const useThreadContext = (): ThreadRuntime => {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error("useThreadContext must be used within a ThreadProvider");
  }
  return context;
};

export const useThreadContextOptional = (): ThreadRuntime | null => {
  return useContext(ThreadContext);
};

export type ThreadProviderProps = PropsWithChildren<{
  runtime: ThreadRuntime;
}>;

export const ThreadProvider: FC<ThreadProviderProps> = ({
  runtime,
  children,
}) => {
  return (
    <ThreadContext.Provider value={runtime}>{children}</ThreadContext.Provider>
  );
};
