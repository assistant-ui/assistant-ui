import type { CreateMessage, Message } from "ai";
import { createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { BranchState } from "../hooks/useBranches";
import type { ComposerStore } from "./ComposerState";

// type TextContent = {
//   type: "text";
//   text: string;
// };

// type ImageContent = {
//   type: "image";
//   image: string;
// };

// type ThreadUserMessageContent = TextContent | ImageContent;
// type ThreadAssistantMessageContent = TextContent | ImageContent;

// type ThreadUserMessage = {
//   id: string;
//   role: "user";
//   content: ThreadUserMessageContent[];
// };

// type ThreadAssistantMessage = {
//   id: string;
//   role: "assistant";
//   content: ThreadAssistantMessageContent[];
// };

// type ThreadMessage = ThreadUserMessage | ThreadAssistantMessage;

export type ThreadState = {
  messages: Message[];
  setMessages: (value: Message[]) => void;

  isLoading: boolean;
  reload: () => Promise<void>;
  append: (message: CreateMessage) => Promise<void>;
  stop: () => void;
};

export type BranchObserver = {
  getBranchState: (message: Message) => BranchState;
  switchToBranch: (message: Message, branchId: number) => void;
  editAt: (message: Message, newMesssage: CreateMessage) => Promise<void>;
  reloadAt: (message: Message) => Promise<void>;
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
