import type { ReactNode } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { ThreadComposerState } from "./ComposerStore";

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

export type ThreadMessageBase = {
  id: string;
  parentId: string;
  createdAt: Date;
  branchId: number;
  branchCount: number;
};

export type ThreadUserMessage = ThreadMessageBase & {
  role: "user";
  content: ThreadUserMessageContent[];
};

export type ThreadAssistantMessage = ThreadMessageBase & {
  role: "assistant";
  content: ThreadAssistantMessageContent[];
};

export type ThreadMessage = ThreadUserMessage | ThreadAssistantMessage;
export type CreateThreadMessage = Omit<
  ThreadUserMessage,
  "id" | "branchId" | "branchCount" | "createdAt" | "role"
>;

export type ThreadState = {
  messages: ThreadMessage[];
  isLoading: boolean;
  switchToBranch: (messageId: string, branchId: number) => void;
  append: (message: CreateThreadMessage) => Promise<void>;
  reload: (messageId: string) => Promise<void>;
  stop: () => void;

  // UI only
  isAtBottom: boolean;
  scrollToBottom: () => void;
  onScrollToBottom: (callback: () => void) => () => void;
};

export type AssistantStore = {
  useThread: UseBoundStore<StoreApi<ThreadState>>;
  useComposer: UseBoundStore<StoreApi<ThreadComposerState>>;
};

export const ROOT_PARENT_ID = "__ROOT_ID__";
