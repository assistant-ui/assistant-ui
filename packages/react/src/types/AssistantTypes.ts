import type { ReactNode } from "react";
import { CompleteAttachment } from "./AttachmentTypes";

export type MessageRole = "user" | "assistant" | "system";

export type TextContentPart = {
  type: "text";
  text: string;
};

export type ImageContentPart = {
  type: "image";
  image: string;
};

export type Unstable_AudioContentPart = {
  type: "audio";
  audio: {
    data: string;
    format: "mp3" | "wav";
  };
};

export type UIContentPart = {
  type: "ui";
  display: ReactNode;
};

export type CoreToolCallContentPart<
  TArgs extends Record<string, unknown> = Record<string | number, unknown>,
  TResult = unknown,
> = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: TArgs;
  result?: TResult | undefined;
  isError?: boolean | undefined;
};

export type ToolCallContentPart<
  TArgs extends Record<string, unknown> = Record<string | number, unknown>,
  TResult = unknown,
> = CoreToolCallContentPart<TArgs, TResult> & {
  argsText: string;
};

export type ThreadUserContentPart =
  | TextContentPart
  | ImageContentPart
  | Unstable_AudioContentPart
  | UIContentPart;

export type ThreadAssistantContentPart =
  | TextContentPart
  | ToolCallContentPart
  | UIContentPart;

type MessageCommonProps = {
  id: string;
  createdAt: Date;
};

export type ThreadStep = {
  usage?:
    | {
        promptTokens: number;
        completionTokens: number;
      }
    | undefined;
};

export type ContentPartStatus =
  | {
      type: "running";
    }
  | {
      type: "complete";
    }
  | {
      type: "incomplete";
      reason: "cancelled" | "length" | "content-filter" | "other" | "error";
      error?: unknown;
    };

export type ToolCallContentPartStatus =
  | {
      type: "requires-action";
      reason: "tool-calls";
    }
  | ContentPartStatus;

export type MessageStatus =
  | {
      type: "running";
    }
  | {
      type: "requires-action";
      reason: "tool-calls";
    }
  | {
      type: "complete";
      reason: "stop" | "unknown";
    }
  | {
      type: "incomplete";
      reason:
        | "cancelled"
        | "tool-calls"
        | "length"
        | "content-filter"
        | "other"
        | "error";
      error?: unknown;
    };

export type ThreadSystemMessage = MessageCommonProps & {
  role: "system";
  content: [TextContentPart];
};

export type ThreadUserMessage = MessageCommonProps & {
  role: "user";
  content: ThreadUserContentPart[];
  attachments: readonly CompleteAttachment[];
  // TODO metadata
};

export type ThreadAssistantMessage = MessageCommonProps & {
  role: "assistant";
  content: ThreadAssistantContentPart[];
  status: MessageStatus;
  metadata?: {
    steps?: ThreadStep[] | undefined;
    custom?: Record<string, unknown> | undefined;
  };
};

export type AppendMessage = CoreMessage & {
  parentId: string | null;
  attachments: readonly CompleteAttachment[];
  startRun?: boolean | undefined;
};

type BaseThreadMessage = {
  status?: ThreadAssistantMessage["status"];
  metadata?: ThreadAssistantMessage["metadata"];
  attachments?: ThreadUserMessage["attachments"];
};

export type ThreadMessage = BaseThreadMessage &
  (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);

/** Core Message Types (without UI content parts) */

export type CoreUserContentPart =
  | TextContentPart
  | ImageContentPart
  | Unstable_AudioContentPart;
export type CoreAssistantContentPart =
  | TextContentPart
  | CoreToolCallContentPart;

export type CoreSystemMessage = {
  role: "system";
  content: [TextContentPart];
};

export type CoreUserMessage = {
  role: "user";
  content: CoreUserContentPart[];
};

export type CoreAssistantMessage = {
  role: "assistant";
  content: CoreAssistantContentPart[];
};

export type CoreMessage =
  | CoreSystemMessage
  | CoreUserMessage
  | CoreAssistantMessage;
