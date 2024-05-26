import type { ReactNode } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { BranchState } from "../../../vercel/useVercelAIBranches";
import type { ComposerStore } from "./ComposerTypes";

// TODO metadata field

export type ThreadMessageTextPart = {
  type: "text";
  text: string;
};

export type ThreadMessageImagePart = {
  type: "image";
  image: string;
};

export type ThreadMessageUIPart = {
  type: "ui";
  display: ReactNode;
};

export type ThreadMessageToolCallPart = {
  type: "tool-call";
  name: string;
  args: object;
  result?: object;
};

export type ThreadUserMessageContent =
  | ThreadMessageTextPart
  | ThreadMessageImagePart
  | ThreadMessageUIPart;
export type ThreadAssistantMessageContent =
  | ThreadMessageTextPart
  | ThreadMessageImagePart
  | ThreadMessageUIPart
  | ThreadMessageToolCallPart;

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
  append: (message: CreateThreadMessage) => Promise<void>;
  stop: () => void;

  isAtBottom: boolean;
  scrollToBottom: () => void;
  onScrollToBottom: (callback: () => void) => () => void;
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
