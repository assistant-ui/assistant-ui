import type { ReactNode } from "react";
import { CompleteAttachment } from "./AttachmentTypes";

export type MessageRole = "user" | "assistant" | "system";

export type TextContentPart = {
  readonly type: "text";
  readonly text: string;
};

export type ImageContentPart = {
  readonly type: "image";
  readonly image: string;
};

export type Unstable_AudioContentPart = {
  readonly type: "audio";
  readonly audio: {
    readonly data: string;
    readonly format: "mp3" | "wav";
  };
};

export type UIContentPart = {
  readonly type: "ui";
  readonly display: ReactNode;
};

export type CoreToolCallContentPart<
  TArgs extends Record<string, unknown> = Record<string | number, unknown>,
  TResult = unknown,
> = {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: TArgs;
  readonly result?: TResult | undefined;
  readonly isError?: boolean | undefined;
};

export type ToolCallContentPart<
  TArgs extends Record<string, unknown> = Record<string | number, unknown>,
  TResult = unknown,
> = CoreToolCallContentPart<TArgs, TResult> & {
  readonly argsText: string;
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
  readonly id: string;
  readonly createdAt: Date;
};

export type ThreadStep = {
  readonly usage?:
    | {
        readonly promptTokens: number;
        readonly completionTokens: number;
      }
    | undefined;
};

export type ContentPartStatus =
  | {
      readonly type: "running";
    }
  | {
      readonly type: "complete";
    }
  | {
      readonly type: "incomplete";
      readonly reason:
        | "cancelled"
        | "length"
        | "content-filter"
        | "other"
        | "error";
      readonly error?: unknown;
    };

export type ToolCallContentPartStatus =
  | {
      readonly type: "requires-action";
      readonly reason: "tool-calls";
    }
  | ContentPartStatus;

export type MessageStatus =
  | {
      readonly type: "running";
    }
  | {
      readonly type: "requires-action";
      readonly reason: "tool-calls";
    }
  | {
      readonly type: "complete";
      readonly reason: "stop" | "unknown";
    }
  | {
      readonly type: "incomplete";
      readonly reason:
        | "cancelled"
        | "tool-calls"
        | "length"
        | "content-filter"
        | "other"
        | "error";
      readonly error?: unknown;
    };

export type ThreadSystemMessage = MessageCommonProps & {
  readonly role: "system";
  readonly content: [TextContentPart];
  readonly metadata: {
    readonly custom: Record<string, unknown>;
  };
};

export type ThreadUserMessage = MessageCommonProps & {
  readonly role: "user";
  readonly content: ThreadUserContentPart[];
  readonly attachments: readonly CompleteAttachment[];
  readonly metadata: {
    readonly custom: Record<string, unknown>;
  };
};

export type ThreadAssistantMessage = MessageCommonProps & {
  readonly role: "assistant";
  readonly content: ThreadAssistantContentPart[];
  readonly status: MessageStatus;
  readonly metadata: {
    readonly steps: ThreadStep[];
    readonly custom: Record<string, unknown>;
  };
};

export type RunConfig = {
  // TODO allow user customization via global type overrides
  custom?: unknown;
};

export type AppendMessage = CoreMessage & {
  parentId: string | null;
  attachments: readonly CompleteAttachment[];
  startRun?: boolean | undefined;
  /** TODO: make required in 0.8.0 */
  runConfig?: RunConfig | undefined;
};

type BaseThreadMessage = {
  readonly status?: ThreadAssistantMessage["status"];
  readonly metadata: {
    readonly steps?: ThreadStep[];
    readonly custom: Record<string, unknown>;
  };
  readonly attachments?: ThreadUserMessage["attachments"];
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
