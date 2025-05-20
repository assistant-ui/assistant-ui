import { CompleteAttachment } from "./AttachmentTypes";
import {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "../utils/json/json-value";

export type MessageRole = ThreadMessage["role"];

export type TextContentPart = {
  readonly type: "text";
  readonly text: string;
};

export type ReasoningContentPart = {
  readonly type: "reasoning";
  readonly text: string;
};

export type SourceContentPart = {
  readonly type: "source";
  readonly sourceType: "url";
  readonly id: string;
  readonly url: string;
  readonly title?: string;
};

export type ImageContentPart = {
  readonly type: "image";
  readonly image: string;
};

export type FileContentPart = {
  readonly type: "file";
  readonly data: string;
  readonly mimeType: string;
};

export type Unstable_AudioContentPart = {
  readonly type: "audio";
  readonly audio: {
    readonly data: string;
    readonly format: "mp3" | "wav";
  };
};

export type ToolCallContentPart<
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
};

export type ThreadUserContentPart =
  | TextContentPart
  | ImageContentPart
  | FileContentPart
  | Unstable_AudioContentPart;

export type ThreadAssistantContentPart =
  | TextContentPart
  | ReasoningContentPart
  | ToolCallContentPart
  | SourceContentPart
  | FileContentPart;

type MessageCommonProps = {
  readonly id: string;
  readonly createdAt: Date;
};

export type ThreadStep = {
  readonly messageId?: string;
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
      readonly error?: ReadonlyJSONValue;
    };

export type ThreadSystemMessage = MessageCommonProps & {
  readonly role: "system";
  readonly content: readonly [TextContentPart];
  readonly metadata: {
    readonly custom: Record<string, unknown>;
  };
};

export type ThreadUserMessage = MessageCommonProps & {
  readonly role: "user";
  readonly content: readonly ThreadUserContentPart[];
  readonly attachments: readonly CompleteAttachment[];
  readonly metadata: {
    readonly custom: Record<string, unknown>;
  };
};

export type ThreadAssistantMessage = MessageCommonProps & {
  readonly role: "assistant";
  readonly content: readonly ThreadAssistantContentPart[];
  readonly status: MessageStatus;
  readonly metadata: {
    readonly unstable_state: ReadonlyJSONValue;
    readonly unstable_annotations: readonly ReadonlyJSONValue[];
    readonly unstable_data: readonly ReadonlyJSONValue[];
    readonly steps: readonly ThreadStep[];
    readonly custom: Record<string, unknown>;
  };
};

export type RunConfig = {
  // TODO allow user customization via global type overrides
  readonly custom?: Record<string, unknown>;
};

export type AppendMessage = Omit<ThreadMessage, "id"> & {
  parentId: string | null;

  /** The ID of the message that was edited or undefined. */
  sourceId: string | null;
  runConfig: RunConfig | undefined;
  startRun?: boolean | undefined;
};

type BaseThreadMessage = {
  readonly status?: ThreadAssistantMessage["status"];
  readonly metadata: {
    readonly unstable_state?: ReadonlyJSONValue;
    readonly unstable_annotations?: readonly ReadonlyJSONValue[];
    readonly unstable_data?: readonly ReadonlyJSONValue[];
    readonly steps?: readonly ThreadStep[];
    readonly custom: Record<string, unknown>;
  };
  readonly attachments?: ThreadUserMessage["attachments"];
};

export type ThreadMessage = BaseThreadMessage &
  (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);
