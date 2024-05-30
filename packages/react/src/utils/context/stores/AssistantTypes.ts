import type { ReactNode } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { ThreadComposerState } from "./ComposerStore";
import type { ThreadViewportState } from "./ViewportStore";

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
  branches: string[];
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
export type CreateThreadMessage = Pick<
  ThreadUserMessage,
  "parentId" | "content"
>;

export type ThreadState = {
  messages: ThreadMessage[];
  isRunning: boolean;
  switchToBranch: (branchId: string) => void;
  append: (message: CreateThreadMessage) => void;
  startRun: (parentId: string) => void;
  cancelRun: () => void;
};

export type AssistantStore = {
  useViewport: UseBoundStore<StoreApi<ThreadViewportState>>;
  useThread: UseBoundStore<StoreApi<ThreadState>>;
  useComposer: UseBoundStore<StoreApi<ThreadComposerState>>;
};

export const ROOT_PARENT_ID = "__ROOT_ID__";
