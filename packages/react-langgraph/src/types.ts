import type {
  MessageStatus,
  AttachmentAdapter,
  DictationAdapter,
  ExternalStoreSharedOptions,
  FeedbackAdapter,
  RealtimeVoiceAdapter,
  RemoteThreadListAdapter,
  SpeechSynthesisAdapter,
} from "@assistant-ui/core";
import type { DataMessagePartComponent } from "@assistant-ui/core/react";
import type { AssistantCloud } from "assistant-cloud";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type {
  LangGraphInterruptState,
  LangGraphSendMessageConfig,
  LangGraphStreamCallback,
} from "./useLangGraphMessages";

export type LangChainToolCallChunk = {
  index: number;
  id: string;
  name: string;
  args?: string;
  args_json?: string;
};

export type LangChainToolCall = {
  index?: number;
  id: string;
  name: string;
  args: ReadonlyJSONObject;
  partial_json?: string;
};

export type MessageContentText = {
  type: "text" | "text_delta";
  text: string;
};

export type MessageContentImageUrl = {
  type: "image_url";
  image_url: string | { url?: string };
};

export type MessageContentThinking = {
  type: "thinking";
  thinking: string;
};

export type MessageContentReasoningSummaryText = {
  type: "summary_text";
  text?: string;
};

export type MessageContentReasoning = {
  type: "reasoning";
  summary?: MessageContentReasoningSummaryText[];
  reasoning?: string;
};

type MessageContentToolUse = {
  type: "tool_use" | "input_json_delta";
};

type MessageContentComputerCall = {
  type: "computer_call";
  call_id: string;
  id: string;
  action: unknown;
  pending_safety_checks: unknown[];
  index: number;
};

export enum LangGraphKnownEventTypes {
  Messages = "messages",
  MessagesPartial = "messages/partial",
  MessagesComplete = "messages/complete",
  Metadata = "metadata",
  Updates = "updates",
  Values = "values",
  Info = "info",
  Error = "error",
}

type CustomEventType = string;

export type EventType = LangGraphKnownEventTypes | CustomEventType;

export type MessageContentFile = {
  type: "file";
  data: string;
  mime_type: string;
  source_type?: "base64" | "url" | "id";
  metadata?: {
    filename?: string;
  };
};

type UserMessageContentComplex =
  | MessageContentText
  | MessageContentImageUrl
  | MessageContentFile;
type AssistantMessageContentComplex =
  | MessageContentText
  | MessageContentImageUrl
  | MessageContentToolUse
  | MessageContentFile
  | MessageContentReasoning
  | MessageContentThinking
  | MessageContentComputerCall;

type UserMessageContent = string | UserMessageContentComplex[];
type AssistantMessageContent = string | AssistantMessageContentComplex[];

export type LangChainMessage =
  | {
      id?: string;
      type: "system";
      content: string;
      additional_kwargs?: Record<string, unknown>;
    }
  | {
      id?: string;
      type: "human";
      content: UserMessageContent;
      additional_kwargs?: Record<string, unknown>;
    }
  | {
      id?: string;
      type: "tool";
      content: string;
      tool_call_id: string;
      name: string;
      artifact?: any;
      status: "success" | "error";
    }
  | {
      id?: string;
      type: "ai";
      content: AssistantMessageContent;
      tool_call_chunks?: LangChainToolCallChunk[];
      tool_calls?: LangChainToolCall[];
      status?: MessageStatus;
      additional_kwargs?: {
        reasoning?: MessageContentReasoning;
        tool_outputs?: MessageContentComputerCall[];
        metadata?: Record<string, unknown>;
      };
    };

export type LangChainMessageChunk = {
  id?: string | undefined;
  type: "AIMessageChunk";
  content?: AssistantMessageContent | undefined;
  tool_call_chunks?: LangChainToolCallChunk[] | undefined;
};

export type LangChainEvent = {
  event:
    | LangGraphKnownEventTypes.MessagesPartial
    | LangGraphKnownEventTypes.MessagesComplete;
  data: LangChainMessage[];
};

export type LangGraphTupleMetadata = Record<string, unknown>;

export type LangChainMessageTupleEvent = {
  event: LangGraphKnownEventTypes.Messages;
  data: [LangChainMessage | LangChainMessageChunk, LangGraphTupleMetadata];
};

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
    [key: string]: unknown;
  };
};

export type RemoveUIMessage = {
  type: "remove-ui";
  id: string;
};

export type OnMessageChunkCallback = (
  chunk: LangChainMessageChunk,
  metadata: LangGraphTupleMetadata,
) => void | Promise<void>;
export type OnValuesEventCallback = (values: unknown) => void | Promise<void>;
export type OnUpdatesEventCallback = (updates: unknown) => void | Promise<void>;
/**
 * Fired when a subgraph (namespaced) `values` event is received. The
 * `namespace` mirrors the pipe-separated suffix on the event name
 * (e.g. `values|tools:call_abc` → `"tools:call_abc"`).
 */
export type OnSubgraphValuesEventCallback = (
  namespace: string,
  values: unknown,
) => void | Promise<void>;
/**
 * Fired when a subgraph (namespaced) `updates` event is received. The
 * `namespace` mirrors the pipe-separated suffix on the event name
 * (e.g. `updates|tools:call_abc` → `"tools:call_abc"`).
 */
export type OnSubgraphUpdatesEventCallback = (
  namespace: string,
  updates: unknown,
) => void | Promise<void>;
export type OnMetadataEventCallback = (
  metadata: unknown,
) => void | Promise<void>;
export type OnInfoEventCallback = (info: unknown) => void | Promise<void>;
export type OnErrorEventCallback = (error: unknown) => void | Promise<void>;
/**
 * Fired when a subgraph (namespaced) `error` event is received, in addition
 * to `onError`. The `namespace` mirrors the pipe-separated suffix on the
 * event name (e.g. `error|tools:call_abc` → `"tools:call_abc"`).
 */
export type OnSubgraphErrorEventCallback = (
  namespace: string,
  error: unknown,
) => void | Promise<void>;
export type OnCustomEventCallback = (
  type: string,
  data: unknown,
) => void | Promise<void>;

/** Private state and actions `useLangGraphRuntime` exposes through `thread.extras`. */
export type LangGraphRuntimeExtras = {
  send: (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig,
  ) => Promise<void>;
  interrupt: LangGraphInterruptState | undefined;
  messageMetadata: Map<string, LangGraphTupleMetadata>;
  uiMessages: readonly UIMessage[];
};

export type UseLangGraphRuntimeOptions = ExternalStoreSharedOptions & {
  /**
   * Called whenever the active thread's canonical (remote) ID changes, so the
   * value can be treated as a managed/controlled variable (e.g. synced to a URL
   * query param). Only the settled remote ID is emitted: while a freshly created
   * thread is still optimistic the value is `undefined`, and the real ID is
   * emitted once the thread is initialized; the transient local ID is never
   * surfaced.
   */
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  autoCancelPendingToolCalls?: boolean | undefined;
  /**
   * When true, renders the Cancel button in the composer and aborts the
   * `AbortController` whose signal is exposed to your `stream` callback
   * as `config.abortSignal`.
   */
  unstable_allowCancellation?: boolean | undefined;
  /**
   * Opt in to message queuing: a message sent during a run is held in
   * `composer.queue` and sent once the run settles. Steering runs it next.
   */
  unstable_enableMessageQueue?: boolean | undefined;
  stream: LangGraphStreamCallback<LangChainMessage>;
  /**
   * State key under which LangGraph's `typed_ui` writes Generative UI
   * messages in the graph state. Must match the `stateKey` option passed to
   * `typedUi(config, { stateKey })` on the server. Defaults to `"ui"`.
   */
  uiStateKey?: string;
  /**
   * Resolves a checkpoint ID for a given thread and message history.
   * When provided, enables message editing (onEdit) and regeneration (onReload).
   * The checkpoint ID is passed to the stream callback for server-side forking.
   */
  getCheckpointId?: (
    threadId: string,
    parentMessages: LangChainMessage[],
  ) => Promise<string | null>;
  load?: (
    threadId: string,
    config?: { signal: AbortSignal },
  ) => Promise<{
    messages: LangChainMessage[];
    interrupts?: LangGraphInterruptState[];
    /**
     * Persisted LangSmith Generative UI messages for this thread, typically
     * read from `state.values[uiStateKey]` returned by the LangGraph SDK's
     * `client.threads.getState()`. Defaults to an empty list.
     */
    uiMessages?: UIMessage[];
  }>;
  create?: () => Promise<{
    externalId: string;
  }>;
  delete?: (threadId: string) => Promise<void>;
  adapters?:
    | {
        attachments?: AttachmentAdapter;
        speech?: SpeechSynthesisAdapter;
        dictation?: DictationAdapter;
        voice?: RealtimeVoiceAdapter;
        feedback?: FeedbackAdapter;
      }
    | undefined;
  eventHandlers?:
    | {
        /**
         * Called for each message chunk received from messages-tuple streaming,
         * with the chunk and its associated metadata
         */
        onMessageChunk?: OnMessageChunkCallback;
        /**
         * Called when top-level values events are received from the LangGraph stream.
         * Subgraph values are routed to `onSubgraphValues`.
         */
        onValues?: OnValuesEventCallback;
        /**
         * Called when top-level updates events are received from the LangGraph stream.
         * Subgraph updates are routed to `onSubgraphUpdates`.
         */
        onUpdates?: OnUpdatesEventCallback;
        /** Called when a subgraph (namespaced) values event is received. */
        onSubgraphValues?: OnSubgraphValuesEventCallback;
        /** Called when a subgraph (namespaced) updates event is received. */
        onSubgraphUpdates?: OnSubgraphUpdatesEventCallback;
        /**
         * Called when metadata is received from the LangGraph stream
         */
        onMetadata?: OnMetadataEventCallback;
        /**
         * Called when informational messages are received from the LangGraph stream
         */
        onInfo?: OnInfoEventCallback;
        /**
         * Called when errors occur during LangGraph stream processing.
         * Fires for both top-level and subgraph errors; subgraph errors
         * additionally trigger `onSubgraphError` with the namespace.
         */
        onError?: OnErrorEventCallback;
        /** Called when a subgraph (namespaced) error event is received, in addition to `onError`. */
        onSubgraphError?: OnSubgraphErrorEventCallback;
        /**
         * Called when custom events are received from the LangGraph stream
         */
        onCustomEvent?: OnCustomEventCallback;
      }
    | undefined;
  /**
   * Register data renderers for Generative UI components.
   *
   * `renderers` maps a `ui_message` name to a static component.
   * `fallback` handles any name without a static match — use this for
   * dynamic loading (e.g. LangSmith's `LoadExternalComponent`).
   */
  uiComponents?:
    | {
        fallback?: DataMessagePartComponent;
        renderers?: Record<string, DataMessagePartComponent>;
      }
    | undefined;
  cloud?: AssistantCloud | undefined;
  /**
   * A `RemoteThreadListAdapter` to use instead of the cloud adapter. Provide
   * this to back the thread list with a custom store (e.g. LangGraph
   * `client.threads.search()`) so pre-existing LangGraph thread ids appear in
   * the UI and can be switched between without assistant-cloud.
   *
   * When provided, `cloud`, `create`, and `delete` are ignored — the adapter
   * owns the full thread list lifecycle. The `externalId` returned by the
   * adapter's `list()` / `initialize()` is what the `load` callback receives.
   */
  unstable_threadListAdapter?: RemoteThreadListAdapter | undefined;
};
