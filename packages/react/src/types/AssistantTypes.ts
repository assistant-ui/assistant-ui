import { LanguageModelV1LogProbs } from "@ai-sdk/provider";
import type { ReactNode } from "react";
import { MessageAttachment } from "../context/stores/Attachment";

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
  | UIContentPart;

export type ThreadAssistantContentPart =
  | TextContentPart
  | ToolCallContentPart
  | UIContentPart;

type MessageCommonProps = {
  id: string;
  createdAt: Date;
};

export type ThreadRoundtrip = {
  logprobs?: LanguageModelV1LogProbs | undefined;
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
  attachments: readonly MessageAttachment[];
  // TODO metadata
};

export type ThreadAssistantMessage = MessageCommonProps & {
  role: "assistant";
  content: ThreadAssistantContentPart[];
  status: MessageStatus;
  /**
   * @deprecated Use `metadata.roundtrips` instead.
   */
  roundtrips?: ThreadRoundtrip[] | undefined;
  metadata?: {
    roundtrips?: ThreadRoundtrip[] | undefined;
    custom?: Record<string, unknown> | undefined;
  };
};

export type AppendMessage = CoreMessage & {
  parentId: string | null;
  attachments: readonly MessageAttachment[];
};

export type ThreadMessage =
  | ThreadSystemMessage
  | ThreadUserMessage
  | ThreadAssistantMessage;

/** Core Message Types (without UI content parts) */

export type CoreUserContentPart = TextContentPart | ImageContentPart;
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
