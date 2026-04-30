import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";
import type { ToolModelContentPart } from "assistant-stream";
import type { CompleteAttachment } from "./attachment";

export type { ToolModelContentPart };

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

export type SourceProviderMetadata = {
  readonly [providerName: string]: ReadonlyJSONObject;
};

export type SourceMessagePart =
  | {
      readonly type: "source";
      readonly sourceType: "url";
      readonly id: string;
      readonly url: string;
      readonly title?: string;
      readonly providerMetadata?: SourceProviderMetadata;
      readonly parentId?: string;
    }
  | {
      readonly type: "source";
      readonly sourceType: "document";
      readonly id: string;
      readonly url?: undefined;
      readonly title: string;
      readonly mediaType: string;
      readonly filename?: string;
      readonly providerMetadata?: SourceProviderMetadata;
      readonly parentId?: string;
    };

export type ImageMessagePart = {
  readonly type: "image";
  readonly image: string;
  readonly filename?: string;
};

export type VideoMessagePart = {
  readonly type: "video";
  readonly url: string;
  readonly mimeType?: string;
  readonly filename?: string;
  readonly posterUrl?: string;
  readonly width?: number;
  readonly height?: number;
  readonly durationSeconds?: number;
  readonly providerMetadata?: ReadonlyJSONObject;
  readonly parentId?: string;
};

export type FileMessagePart = {
  readonly type: "file";
  readonly filename?: string;
  readonly data: string;
  readonly mimeType: string;
  readonly parentId?: string;
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

/**
 * A JSON spec describing a tree of UI components to render.
 *
 * The agent emits a {@link GenerativeUIMessagePart} containing this spec, and
 * the consumer-provided component allowlist is used to resolve `component`
 * names. Any component referenced that is not present in the allowlist is
 * rejected with a typed error — the allowlist is the security boundary in the
 * default same-realm rendering path.
 */
export type GenerativeUINode =
  | string
  | {
      /** Allowlisted component name (resolved against the consumer registry). */
      readonly component: string;
      /** Props passed to the resolved component (must be JSON-serializable). */
      readonly props?: Record<string, unknown>;
      /** Optional children — strings render as text, objects recurse. */
      readonly children?: readonly GenerativeUINode[];
      /** Optional stable key for React reconciliation. */
      readonly key?: string;
    };

/**
 * The root spec for a generative UI tree.
 */
export type GenerativeUISpec = {
  /** Root node(s) to render. */
  readonly root: GenerativeUINode | readonly GenerativeUINode[];
};

/**
 * A message part that carries a JSON spec describing UI to render.
 *
 * Render with `<MessagePrimitive.GenerativeUI components={...} />`. The
 * primitive resolves component names against the consumer-provided allowlist
 * — any unknown name throws a typed error rather than rendering. Stream-
 * friendly: a partially-streamed spec renders progressively.
 */
export type GenerativeUIMessagePart = {
  readonly type: "generative-ui";
  /** The JSON spec describing the UI tree. */
  readonly spec: GenerativeUISpec;
  /** Optional id (useful for replays / stable keys). */
  readonly id?: string;
  readonly parentId?: string;
};

export type McpAppMetadata = {
  readonly resourceUri: string;
  readonly mimeType?: string;
  readonly visibility?: readonly ("model" | "app")[];
};

export const MCP_APP_URI_SCHEME = "ui://";

export const isMcpAppUri = (uri: string | undefined): boolean =>
  !!uri?.startsWith(MCP_APP_URI_SCHEME);

export type ToolCallMessagePartMcpMetadata = {
  readonly app?: McpAppMetadata;
};

export type ToolCallMessagePart<
  TArgs = ReadonlyJSONObject,
  TResult = unknown,
> = {
  /** Identifies this part as a tool call. */
  readonly type: "tool-call";
  /** Stable identifier for this invocation of the tool. */
  readonly toolCallId: string;
  /** Name of the tool requested by the model. */
  readonly toolName: string;
  /**
   * Arguments supplied by the model. During streaming this is a partial parse:
   * fields may be missing or incomplete. From a tool-call renderer, use
   * `useToolArgsStatus` to detect which fields are still arriving.
   */
  readonly args: TArgs;
  /** Result returned by the tool, if it has completed. */
  readonly result?: TResult | undefined;
  /** Whether the result represents a tool execution error. */
  readonly isError?: boolean | undefined;
  /** Raw JSON argument text streamed by the model. */
  readonly argsText: string;
  /** UI-only artifact associated with the tool result. */
  readonly artifact?: unknown;
  /** MCP app metadata associated with this tool call, when present. */
  readonly mcp?: ToolCallMessagePartMcpMetadata;
  /** Content returned to the model for this tool result. */
  readonly modelContent?: readonly ToolModelContentPart[] | undefined;
  /** Human-input request that must be resolved before the run can continue. */
  readonly interrupt?: { type: "human"; payload: unknown };
  /** Server-side approval gate. `approved === undefined` is the only state in which `respondToApproval` may be called. */
  readonly approval?: {
    readonly id: string;
    readonly approved?: boolean;
    readonly reason?: string;
    readonly isAutomatic?: boolean;
  };
  /** Parent message-part ID when this part belongs to a nested structure. */
  readonly parentId?: string;
  /**
   * Nested thread messages produced by this tool call, for example a sub-agent
   * conversation.
   */
  readonly messages?: readonly ThreadMessage[];
};

export type ThreadUserMessagePart =
  | TextMessagePart
  | ImageMessagePart
  | VideoMessagePart
  | FileMessagePart
  | DataMessagePart
  | Unstable_AudioMessagePart;

export type ThreadAssistantMessagePart =
  | TextMessagePart
  | ReasoningMessagePart
  | ToolCallMessagePart
  | SourceMessagePart
  | FileMessagePart
  | ImageMessagePart
  | VideoMessagePart
  | DataMessagePart
  | GenerativeUIMessagePart;

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
      /** The tool call is waiting for UI or human input before continuing. */
      readonly type: "requires-action";
      /** Reason the tool call requires action. */
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
