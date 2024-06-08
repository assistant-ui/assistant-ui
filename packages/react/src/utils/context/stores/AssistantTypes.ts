import type { ReactNode } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { ThreadComposerState } from "./ComposerStore";
import type { ThreadViewportState } from "./ViewportStore";

// TODO metadata field

export type TextContentPart = {
  type: "text";
  text: string;
};

// TODO image input support
export type ImageContentPart = {
  type: "image";
  image: string;
};

export type UIContentPart = {
  type: "ui";
  display: ReactNode;
};

export type ToolCallContentPart = {
  type: "tool-call";
  name: string;
  args: object;
  result?: object;
};

export type UserContentPart =
  | TextContentPart
  | ImageContentPart
  | UIContentPart;

export type AssistantContentPart =
  | TextContentPart
  | UIContentPart
  | ToolCallContentPart;

export type AppendContentPart = TextContentPart | ImageContentPart;

export type BaseMessage = {
  id: string;
  createdAt: Date;
};

export type UserMessage = BaseMessage & {
  role: "user";
  content: UserContentPart[];
};

export type AssistantMessage = BaseMessage & {
  role: "assistant";
  content: AssistantContentPart[];
  status: "in_progress" | "done" | "error";
};

export type AppendMessage = {
  parentId: string | null;
  content: AppendContentPart[];
};

export type ThreadMessage = UserMessage | AssistantMessage;

export type ThreadState = {
  messages: ThreadMessage[];
  isRunning: boolean;

  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;

  append: (message: AppendMessage) => void;
  startRun: (parentId: string | null) => void;
  cancelRun: () => void;
};

export type AssistantStore = {
  useViewport: UseBoundStore<StoreApi<ThreadViewportState>>;
  useThread: UseBoundStore<StoreApi<ThreadState>>;
  useComposer: UseBoundStore<StoreApi<ThreadComposerState>>;
};
