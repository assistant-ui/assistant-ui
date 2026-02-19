import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";
import type { CompleteAttachment } from "./attachment";

// =============================================================================
// Message Parts
// =============================================================================

export type TextMessagePart = {
  readonly type: "text";
  readonly text: string;
  readonly parentId?: string;
};

export type ReasoningMessagePart = {
  readonly type: "reasoning";
  readonly text: string;
  readonly parentId?: string;
};

export type SourceMessagePart = {
  readonly type: "source";
  readonly sourceType: "url";
  readonly id: string;
  readonly url: string;
  readonly title?: string;
  readonly parentId?: string;
};

export type ImageMessagePart = {
  readonly type: "image";
  readonly image: string;
  readonly filename?: string;
};

export type FileMessagePart = {
  readonly type: "file";
  readonly filename?: string;
  readonly data: string;
  readonly mimeType: string;
};

export type Unstable_AudioMessagePart = {
  readonly type: "audio";
  readonly audio: {
    readonly data: string;
    readonly format: "mp3" | "wav";
  };
};

export type DataMessagePart<T = any> = {
  readonly type: "data";
  readonly name: string;
  readonly data: T;
};

export type ToolCallMessagePart<
  TArgs = ReadonlyJSONObject,
  TResult = unknown,
> = {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: TArgs;
  readonly result?: TResult | undefined;
  readonly isError?: boolean | undefined;
  readonly argsText: string;
  readonly artifact?: unknown;
  readonly interrupt?: { type: "human"; payload: unknown };
  readonly parentId?: string;
  readonly messages?: readonly ThreadMessage[];
};

export type DataUIPart = {
  readonly type: `data-${string}`;
  readonly data: unknown;
  readonly id?: string;
};

export type ThreadUserMessagePart =
  | TextMessagePart
  | ImageMessagePart
  | FileMessagePart
  | DataMessagePart
  | DataUIPart
  | Unstable_AudioMessagePart;

export type ThreadAssistantMessagePart =
  | TextMessagePart
  | ReasoningMessagePart
  | ToolCallMessagePart
  | SourceMessagePart
  | FileMessagePart
  | ImageMessagePart
  | DataMessagePart;

// =============================================================================
// Message Status
// =============================================================================

export type MessagePartStatus =
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

export type ToolCallMessagePartStatus =
  | {
      readonly type: "requires-action";
      readonly reason: "interrupt";
    }
  | MessagePartStatus;

export type MessageStatus =
  | {
      readonly type: "running";
    }
  | {
      readonly type: "requires-action";
      readonly reason: "tool-calls" | "interrupt";
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
      readonly error?: ReadonlyJSONValue;
    };

// =============================================================================
// Thread Messages
// =============================================================================

export type MessageTiming = {
  readonly streamStartTime: number;
  readonly firstTokenTime?: number;
  readonly totalStreamTime?: number;
  readonly tokenCount?: number;
  readonly tokensPerSecond?: number;
  readonly totalChunks: number;
  readonly toolCallCount: number;
};

export type ThreadStep = {
  readonly messageId?: string;
  readonly usage?:
    | {
        readonly inputTokens: number;
        readonly outputTokens: number;
      }
    | undefined;
};

type MessageCommonProps = {
  readonly id: string;
  readonly createdAt: Date;
};

export type ThreadSystemMessage = MessageCommonProps & {
  readonly role: "system";
  readonly content: readonly [TextMessagePart];
  readonly metadata: {
    readonly unstable_state?: undefined;
    readonly unstable_annotations?: undefined;
    readonly unstable_data?: undefined;
    readonly steps?: undefined;
    readonly submittedFeedback?: undefined;
    readonly timing?: undefined;
    readonly custom: Record<string, unknown>;
  };
};

export type ThreadUserMessage = MessageCommonProps & {
  readonly role: "user";
  readonly content: readonly ThreadUserMessagePart[];
  readonly attachments: readonly CompleteAttachment[];
  readonly metadata: {
    readonly unstable_state?: undefined;
    readonly unstable_annotations?: undefined;
    readonly unstable_data?: undefined;
    readonly steps?: undefined;
    readonly submittedFeedback?: undefined;
    readonly timing?: undefined;
    readonly custom: Record<string, unknown>;
  };
};

export type ThreadAssistantMessage = MessageCommonProps & {
  readonly role: "assistant";
  readonly content: readonly ThreadAssistantMessagePart[];
  readonly status: MessageStatus;
  readonly metadata: {
    readonly unstable_state: ReadonlyJSONValue;
    readonly unstable_annotations: readonly ReadonlyJSONValue[];
    readonly unstable_data: readonly ReadonlyJSONValue[];
    readonly steps: readonly ThreadStep[];
    readonly submittedFeedback?: { readonly type: "positive" | "negative" };
    readonly timing?: MessageTiming;
    readonly custom: Record<string, unknown>;
  };
};

type BaseThreadMessage = {
  readonly status?: ThreadAssistantMessage["status"];
  readonly metadata: {
    readonly unstable_state?: ReadonlyJSONValue;
    readonly unstable_annotations?: readonly ReadonlyJSONValue[];
    readonly unstable_data?: readonly ReadonlyJSONValue[];
    readonly steps?: readonly ThreadStep[];
    readonly submittedFeedback?: { readonly type: "positive" | "negative" };
    readonly timing?: MessageTiming;
    readonly custom: Record<string, unknown>;
  };
  readonly attachments?: ThreadUserMessage["attachments"];
};

export type ThreadMessage = BaseThreadMessage &
  (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);

export type MessageRole = ThreadMessage["role"];

export type RunConfig = {
  readonly custom?: Record<string, unknown>;
};

export type AppendMessage = Omit<ThreadMessage, "id"> & {
  parentId: string | null;

  /** The ID of the message that was edited or undefined. */
  sourceId: string | null;
  runConfig: RunConfig | undefined;
  startRun?: boolean | undefined;
};
