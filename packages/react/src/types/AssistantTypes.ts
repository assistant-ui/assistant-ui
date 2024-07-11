import { LanguageModelV1FinishReason, LanguageModelV1LogProbs } from "@ai-sdk/provider";
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

export type ThreadUserContentPart =
  | TextContentPart
  | ImageContentPart
  | UIContentPart;

export type ThreadAssistantContentPart =
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
      type: "in_progress";
    }
  | {
      type: "done";
      finishReason?: LanguageModelV1FinishReason;
      logprops?: LanguageModelV1LogProbs;
      usage?: {
        promptTokens: number;
        completionTokens: number;
      };
    }
  | {
      type: "error";
      error: unknown;
    };

export type ThreadSystemMessage = MessageCommonProps & {
  role: "system";
  content: [TextContentPart];
};

export type ThreadUserMessage = MessageCommonProps & {
  role: "user";
  content: ThreadUserContentPart[];
};

export type ThreadAssistantMessage = MessageCommonProps & {
  role: "assistant";
  content: ThreadAssistantContentPart[];
  status: MessageStatus;
};

export type AppendMessage = {
  parentId: string | null;
  role: "user";
  content: AppendContentPart[];
};

export type ThreadMessage =
  | ThreadSystemMessage
  | ThreadUserMessage
  | ThreadAssistantMessage;

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
  | ThreadSystemMessage
  | CoreUserMessage
  | CoreAssistantMessage;
