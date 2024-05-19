import { createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { BranchState } from "../../vercel/useVercelAIBranches";
import type { ComposerStore } from "./ComposerState";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image";
  image: string;
};

export type ThreadUserMessageContent = TextContent | ImageContent;
export type ThreadAssistantMessageContent = TextContent | ImageContent;

export type ThreadUserMessage = {
  id: string;
  role: "user";
  content: ThreadUserMessageContent[];
};

export type ThreadAssistantMessage = {
  id: string;
  role: "assistant";
  content: ThreadAssistantMessageContent[];
};

export type ThreadMessage = ThreadUserMessage | ThreadAssistantMessage;
export type CreateThreadMessage = Omit<ThreadUserMessage, "id">;

export type ThreadState = {
  messages: ThreadMessage[];
  isLoading: boolean;
  reload: () => Promise<void>;
  append: (message: CreateThreadMessage) => Promise<void>;
  stop: () => void;
};

export type BranchObserver = {
  getBranchState: (message: ThreadMessage) => BranchState;
  switchToBranch: (message: ThreadMessage, branchId: number) => void;
  editAt: (
    message: ThreadUserMessage,
    newMesssage: CreateThreadMessage,
  ) => Promise<void>;
  reloadAt: (message: ThreadAssistantMessage) => Promise<void>;
};

export type AssistantStore = ComposerStore & {
  useThread: UseBoundStore<StoreApi<ThreadState>>;
  useBranchObserver: UseBoundStore<StoreApi<BranchObserver>>;
};

export const AssistantContext = createContext<AssistantStore | null>(null);

export const useAssistantContext = () => {
  const context = useContext(AssistantContext);
  if (!context)
    throw new Error(
      "useAssistantContext must be used within a AssistantProvider",
    );
  return context;
};
