import type { ReactNode } from "react";

export type TextContentPart = {
  type: "text";
  text: string;
};

export type ImageContentPart = {
  type: "image";
  image: string;
};

export type UIContentPart = {
  type: "ui";
  display: ReactNode;
};

export type ToolCallContentPart<TArgs = unknown, TResult = unknown> = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: TArgs;
  result?: TResult;
};

export type UserContentPart =
  | TextContentPart
  | ImageContentPart
  | UIContentPart;

export type AssistantContentPart =
  | TextContentPart
  | ToolCallContentPart
  | UIContentPart;

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
  role: "user";
  content: AppendContentPart[];
};

export type ThreadMessage = UserMessage | AssistantMessage;
