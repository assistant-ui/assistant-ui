import type {
  AttachmentAdapter,
  DictationAdapter,
  ExternalStoreSharedOptions,
  FeedbackAdapter,
  MessageStatus,
  RealtimeVoiceAdapter,
  RemoteThreadListAdapter,
  SpeechSynthesisAdapter,
} from "@assistant-ui/core";
import type { AssistantCloud } from "assistant-cloud";
import type { UseStreamOptions, AssembledToolCall } from "@langchain/react";

/** Known content block types from @langchain/core messages. */
export type LangChainContentBlock =
  | { type: "text"; text: string }
  | { type: "text_delta"; text: string }
  | { type: "image_url"; image_url: string | { url: string } }
  | { type: "thinking"; thinking: string }
  | {
      type: "reasoning";
      summary?: Array<{ type: "summary_text"; text: string }>;
      reasoning?: string;
    }
  | {
      type: "file";
      data: string;
      mime_type: string;
      source_type?: "base64";
      metadata?: { filename?: string };
    }
  | { type: "tool_use" | "input_json_delta" };

export type LangChainToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

/**
 * Minimal duck-typed interface for BaseMessage class instances returned by
 * `useStream`. Used internally by the message converter.
 *
 * Uses `unknown` for `content` to remain compatible with
 * `@langchain/core`'s `MessageContent` union.
 */
export type LangChainBaseMessage = {
  _getType: () => string;
  content: unknown;
  id?: string | undefined;
  name?: string | undefined;
  additional_kwargs?: Record<string, unknown> | undefined;
  /** Present on AIMessage */
  tool_calls?: readonly LangChainToolCall[] | undefined;
  /** Present on ToolMessage */
  tool_call_id?: string | undefined;
  /** Completion status (AIMessage) or outcome status (ToolMessage) */
  status?: MessageStatus | "success" | "error" | undefined;
  /** Present on ToolMessage */
  artifact?: unknown;
};

export type LangChainRuntimeExtras = {
  interrupt: { value?: unknown } | undefined;
  interrupts: readonly { value?: unknown }[];
  toolCalls: readonly AssembledToolCall[];
  error: unknown;
  submit: (
    values: Record<string, unknown> | null | undefined,
    options?: Record<string, unknown>,
  ) => Promise<void>;
  respond: (
    response: unknown,
    options?: Record<string, unknown>,
  ) => Promise<void>;
  respondAll: (
    responsesById: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<void>;
  values: Record<string, unknown>;
  messagesKey: string;
};

export type LangChainRuntimeExtraOptions = ExternalStoreSharedOptions & {
  cloud?: AssistantCloud | undefined;
  adapters?:
    | {
        attachments?: AttachmentAdapter | undefined;
        speech?: SpeechSynthesisAdapter | undefined;
        dictation?: DictationAdapter | undefined;
        voice?: RealtimeVoiceAdapter | undefined;
        feedback?: FeedbackAdapter | undefined;
      }
    | undefined;
  /**
   * When the user sends a new message while previous tool calls are
   * still pending, automatically submit `tool` messages that cancel
   * them so the agent's tool-call accounting stays consistent.
   * Defaults to `true`.
   */
  autoCancelPendingToolCalls?: boolean | undefined;
  /**
   * Routes the Cancel button's click to `useStream().stop()`. On by
   * default. Pass `false` to disable the Cancel button.
   */
  unstable_allowCancellation?: boolean | undefined;
  /**
   * Custom `RemoteThreadListAdapter`. When provided, replaces the
   * cloud-backed thread list adapter.
   */
  unstable_threadListAdapter?: RemoteThreadListAdapter | undefined;
  /** Custom thread-creation hook, forwarded to the cloud adapter. */
  create?: (() => Promise<{ externalId: string | undefined }>) | undefined;
  /** Custom thread-deletion hook, forwarded to the cloud adapter. */
  delete?: ((threadId: string) => Promise<void>) | undefined;
};

// Distribute the intersection through the union arms of `UseStreamOptions`
// (`AgentServerOptions | CustomAdapterOptions`). Writing `UseStreamOptions & X`
// directly collapses arm tracking, so `Omit<…, "cloud">` and the like would
// produce a flattened structural type that no longer matches either arm.
export type UseStreamRuntimeOptions = UseStreamOptions extends infer O
  ? O extends UseStreamOptions
    ? O & LangChainRuntimeExtraOptions
    : never
  : never;
