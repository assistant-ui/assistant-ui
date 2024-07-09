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

type MessageCommonProps = {
  id: string;
  createdAt: Date;
};

export type MessageStatus =
  | {
      type: "in_progress" | "done";
      error?: undefined;
    }
  | {
      type: "error";
      error: unknown;
    };

export type SystemMessage = MessageCommonProps & {
  role: "system";
  content: [TextContentPart];
};

export type UserMessage = MessageCommonProps & {
  role: "user";
  content: UserContentPart[];
};

export type AssistantMessage = MessageCommonProps & {
  role: "assistant";
  content: AssistantContentPart[];
  status: MessageStatus;
};

export type AppendMessage = {
  parentId: string | null;
  role: "user";
  content: AppendContentPart[];
};

export type ThreadMessage = SystemMessage | UserMessage | AssistantMessage;

/** Core Message Types (without UI content parts) */

export type CoreUserContentPart = TextContentPart | ImageContentPart;
export type CoreAssistantContentPart = TextContentPart | ToolCallContentPart;

export type CoreUserMessage = MessageCommonProps & {
  role: "user";
  content: CoreUserContentPart[];
};

export type CoreAssistantMessage = MessageCommonProps & {
  role: "assistant";
  content: CoreAssistantContentPart[];
  status: MessageStatus;
};

export type CoreThreadMessage =
  | SystemMessage
  | CoreUserMessage
  | CoreAssistantMessage;
