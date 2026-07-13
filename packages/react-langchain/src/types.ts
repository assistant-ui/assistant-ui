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
import type {
  UseStreamOptions,
  AssembledToolCall,
  AnyStream,
  SubagentDiscoverySnapshot,
  SubgraphDiscoverySnapshot,
} from "@langchain/react";

/** Known content block types from @langchain/core messages. */
export type LangChainContentBlock =
  | { type: "text"; text: string }
  | { type: "text_delta"; text: string }
  | { type: "image_url"; image_url: string | { url?: string } }
  | { type: "thinking"; thinking: string }
  | {
      type: "reasoning";
      summary?: Array<{ type: "summary_text"; text?: string }>;
      reasoning?: string;
    }
  | {
      type: "file";
      data: string;
      mime_type: string;
      source_type?: "base64";
      metadata?: { filename?: string };
    }
  | {
      type: "file";
      url: string;
      mime_type?: string;
      source_type: "url";
      metadata?: { filename?: string };
    }
  | {
      type: "file";
      id: string;
      mime_type?: string;
      source_type: "id";
      metadata?: { filename?: string };
    }
  | { type: "tool_use" | "input_json_delta" };

export type LangChainToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

/**
 * A generative UI component the graph accumulates in its state. Read from
 * `stream.values[uiStateKey]` and rendered via `makeAssistantDataUI`.
 *
 * The parent assistant message is carried in `metadata.message_id` by the
 * Python SDK and in `metadata.id` by the JS SDK; the runtime reads either.
 */
export type UIMessage<
  TName extends string = string,
  TProps extends Record<string, unknown> = Record<string, unknown>,
> = {
  type: "ui";
  id: string;
  name: TName;
  props: TProps;
  metadata?: {
    merge?: boolean;
    run_id?: string;
    name?: string;
    tags?: string[];
    message_id?: string;
    id?: string;
    [key: string]: unknown;
  };
};

/**
 * Emitted on the live `custom` channel by the graph's `remove_ui_message`
 * helper to drop a pushed `UIMessage` by id.
 */
export type RemoveUIMessage = {
  type: "remove-ui";
  id: string;
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
  interrupts: readonly { id?: string; value?: unknown }[];
  toolCalls: readonly AssembledToolCall[];
  subagents: ReadonlyMap<string, SubagentDiscoverySnapshot>;
  subgraphs: ReadonlyMap<string, SubgraphDiscoverySnapshot>;
  stream: AnyStream;
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
  /**
   * Called whenever the active thread's canonical (remote) ID changes, so the
   * value can be treated as a managed/controlled variable (e.g. synced to a URL
   * query param). Only the settled remote ID is emitted: while a freshly created
   * thread is still optimistic the value is `undefined`, and the real ID is
   * emitted once the thread is initialized; the transient local ID is never
   * surfaced.
   */
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
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
  /**
   * State key the graph accumulates generative `UIMessage`s under. Each UI
   * is attached to the assistant message identified by its `metadata.message_id`
   * (Python SDK) or `metadata.id` (JS SDK) and emitted as a `data` part.
   * Defaults to `"ui"`.
   */
  uiStateKey?: string | undefined;
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
