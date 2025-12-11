import { createContext, useContext, FC, PropsWithChildren } from "react";
import type { Unsubscribe } from "@assistant-ui/core";

export type SubscribableRuntime<TState> = {
  getState: () => TState;
  subscribe: (callback: () => void) => Unsubscribe;
};

export type AssistantContextValue = {
  useAssistantRuntime: () => SubscribableRuntime<AssistantRuntimeState> | null;
  useThreadRuntime: () => SubscribableRuntime<ThreadRuntimeState> | null;
  useMessageRuntime: () => SubscribableRuntime<MessageRuntimeState> | null;
  useComposerRuntime: () => SubscribableRuntime<ComposerRuntimeState> | null;
  useContentPartRuntime: () => SubscribableRuntime<ContentPartRuntimeState> | null;
};

export type AssistantRuntimeState = {
  threadId: string;
};

export type ThreadRuntimeState = {
  threadId: string;
  isRunning: boolean;
  isDisabled: boolean;
  messages: readonly MessageRuntimeState[];
  capabilities: {
    switchToBranch: boolean;
    edit: boolean;
    reload: boolean;
    cancel: boolean;
    unstable_copy: boolean;
    speech: boolean;
    attachments: boolean;
    feedback: boolean;
  };
};

export type MessageRuntimeState = {
  id: string;
  role: "user" | "assistant" | "system";
  status:
    | { type: "running" }
    | { type: "complete"; reason: string }
    | { type: "incomplete"; reason: string };
  content: readonly ContentPartRuntimeState[];
  createdAt: Date;
  parentId: string | null;
  branchNumber: number;
  branchCount: number;
  isLast: boolean;
};

export type ContentPartRuntimeState = {
  type: string;
  status:
    | { type: "running" }
    | { type: "complete" }
    | { type: "incomplete"; reason: string };
  part: unknown;
};

export type ComposerRuntimeState = {
  text: string;
  attachments: readonly unknown[];
  canSend: boolean;
  canCancel: boolean;
  isEditing: boolean;
  isEmpty: boolean;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export const useAssistantContext = (): AssistantContextValue => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error(
      "useAssistantContext must be used within an AssistantProvider",
    );
  }
  return context;
};

export const useAssistantContextOptional = (): AssistantContextValue | null => {
  return useContext(AssistantContext);
};

export type AssistantProviderProps = PropsWithChildren<{
  runtime: AssistantContextValue;
}>;

export const AssistantProvider: FC<AssistantProviderProps> = ({
  runtime,
  children,
}) => {
  return (
    <AssistantContext.Provider value={runtime}>
      {children}
    </AssistantContext.Provider>
  );
};
