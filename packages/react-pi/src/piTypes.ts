/**
 * RPC-isomorphic, JSON-safe contract between assistant-ui and Pi.
 *
 * This module is **browser-safe**: it MUST NOT import `@earendil-works/pi-*`.
 * The Pi message/content/event shapes are mirrored here as plain serializable
 * types so they can travel over an arbitrary transport (HTTP/SSE, RPC
 * subprocess, Electron IPC). The shapes are kept structurally faithful to
 * Pi `0.78.0` so the node host (`./node`) can assign real Pi values into them
 * without conversion.
 *
 * Provenance (verified against `@earendil-works/pi-coding-agent@0.78.0`):
 * - content/message shapes: `@earendil-works/pi-ai/dist/types.d.ts`
 * - custom message roles:    `pi-coding-agent/dist/core/messages.d.ts`
 * - agent/session events:    `pi-agent-core/dist/types.d.ts` (`AgentEvent`),
 *                            `pi-coding-agent/dist/core/agent-session.d.ts`
 *                            (`AgentSessionEvent`)
 * - host UI surface:         `pi-coding-agent/dist/core/extensions/types.d.ts`
 *                            (`ExtensionUIContext`, `ContextUsage`)
 */

// ---------------------------------------------------------------------------
// Content parts — mirror of `@earendil-works/pi-ai` content blocks.
// ---------------------------------------------------------------------------

export interface PiTextContent {
  type: "text";
  text: string;
  textSignature?: string;
}

export interface PiThinkingContent {
  type: "thinking";
  thinking: string;
  thinkingSignature?: string;
  /** When true, the thinking content was redacted by safety filters; the opaque
   * payload lives in `thinkingSignature`. Render a "redacted" affordance rather
   * than hiding silently. */
  redacted?: boolean;
}

export interface PiImageContent {
  type: "image";
  /** Base64-encoded image data (or data URL), per Pi `ImageContent`. */
  data: string;
  mimeType: string;
}

export interface PiToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  thoughtSignature?: string;
}

export type PiAssistantContent = PiTextContent | PiThinkingContent | PiToolCall;
export type PiUserContent = PiTextContent | PiImageContent;
export type PiToolResultContent = PiTextContent | PiImageContent;

export interface PiUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

export type PiStopReason = "stop" | "length" | "toolUse" | "error" | "aborted";

// ---------------------------------------------------------------------------
// Messages — mirror of the base LLM `Message` union plus Pi's
// `CustomAgentMessages` augmentation (bashExecution/custom/branchSummary/
// compactionSummary). The union is intentionally *open*: Pi augments it via
// module augmentation, so the projection/reducer must tolerate unknown roles.
// ---------------------------------------------------------------------------

export interface PiUserMessage {
  role: "user";
  content: string | PiUserContent[];
  timestamp: number;
}

export interface PiAssistantMessage {
  role: "assistant";
  content: PiAssistantContent[];
  api: string;
  provider: string;
  model: string;
  responseModel?: string;
  responseId?: string;
  usage: PiUsage;
  stopReason: PiStopReason;
  errorMessage?: string;
  timestamp: number;
}

export interface PiToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  /** Renderable output content (text/image). NOTE: this is the output, NOT
   * `details` — `details` is tool-specific metadata (see `PiToolResultDetails`). */
  content: PiToolResultContent[];
  details?: unknown;
  isError: boolean;
  timestamp: number;
}

/** Bash run via the `!` command — a Pi message role, not a tool call. */
export interface PiBashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  timestamp: number;
  /** `!!` prefix — excluded from LLM context. */
  excludeFromContext?: boolean;
}

/** Extension-injected message via `sendMessage()`. */
export interface PiCustomMessage {
  role: "custom";
  customType: string;
  content: string | PiUserContent[];
  /** When false, participates in LLM context but is hidden in the UI. */
  display: boolean;
  details?: unknown;
  timestamp: number;
}

export interface PiBranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string;
  timestamp: number;
}

export interface PiCompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
  timestamp: number;
}

export type PiKnownAgentMessage =
  | PiUserMessage
  | PiAssistantMessage
  | PiToolResultMessage
  | PiBashExecutionMessage
  | PiCustomMessage
  | PiBranchSummaryMessage
  | PiCompactionSummaryMessage;

/** Forward-compat fallback for augmented/unknown roles. */
export interface PiUnknownAgentMessage {
  role: string;
  timestamp?: number;
  [key: string]: unknown;
}

export type PiAgentMessage = PiKnownAgentMessage | PiUnknownAgentMessage;

/** The canonical transcript is `PiAgentMessage[]`; this alias documents intent. */
export type PiTranscriptMessage = PiAgentMessage;

// ---------------------------------------------------------------------------
// Streaming delta — mirror of `AssistantMessageEvent` (the `contentIndex`
// structural discriminator). Every variant carries `partial`, the current
// assistant message, so the projection can read `partial.content[contentIndex]`
// instead of re-accumulating text.
// ---------------------------------------------------------------------------

export type PiAssistantMessageDelta =
  | { type: "start"; partial: PiAssistantMessage }
  | { type: "text_start"; contentIndex: number; partial: PiAssistantMessage }
  | {
      type: "text_delta";
      contentIndex: number;
      delta: string;
      partial: PiAssistantMessage;
    }
  | {
      type: "text_end";
      contentIndex: number;
      content: string;
      partial: PiAssistantMessage;
    }
  | { type: "thinking_start"; contentIndex: number; partial: PiAssistantMessage }
  | {
      type: "thinking_delta";
      contentIndex: number;
      delta: string;
      partial: PiAssistantMessage;
    }
  | {
      type: "thinking_end";
      contentIndex: number;
      content: string;
      partial: PiAssistantMessage;
    }
  | { type: "toolcall_start"; contentIndex: number; partial: PiAssistantMessage }
  | {
      type: "toolcall_delta";
      contentIndex: number;
      delta: string;
      partial: PiAssistantMessage;
    }
  | {
      type: "toolcall_end";
      contentIndex: number;
      toolCall: PiToolCall;
      partial: PiAssistantMessage;
    }
  | {
      type: "done";
      reason: "stop" | "length" | "toolUse";
      message: PiAssistantMessage;
    }
  | { type: "error"; reason: "aborted" | "error"; error: PiAssistantMessage };

// ---------------------------------------------------------------------------
// Context-window usage — mirror of `ContextUsage`. `tokens`/`percent` are
// nullable (e.g. right after compaction, before the next LLM response).
// ---------------------------------------------------------------------------

export interface PiContextUsage {
  tokens: number | null;
  contextWindow: number;
  percent: number | null;
}

// ---------------------------------------------------------------------------
// Model / credential readiness (PI_MVP_PLAN §5).
// ---------------------------------------------------------------------------

export type PiRuntimeReadiness =
  | {
      state: "ready";
      selection: { provider: string; modelId: string };
      source: "env" | "session" | "pi-default";
    }
  | { state: "missing-model"; message: string }
  | { state: "missing-credentials"; provider?: string; message: string }
  | {
      state: "unavailable-model";
      selection: { provider: string; modelId: string };
      message: string;
    };

// ---------------------------------------------------------------------------
// Thread metadata & input.
// ---------------------------------------------------------------------------

export type PiThreadStatus = "idle" | "running" | "failed";

export type PiQueuedMessage = {
  id: string;
  mode: "followUp" | "steer";
  content: string;
};

export type PiThreadMetadata = {
  id: string;
  title?: string;
  workspacePath?: string;
  archived?: boolean;
  status: PiThreadStatus;
  runningRunId?: string;
  queuedMessages?: readonly PiQueuedMessage[];
  config?: { provider?: string; modelId?: string; thinkingLevel?: string };
  contextUsage?: PiContextUsage;
  /** Session .jsonl path — the durable handle (`SessionInfo.path`). */
  sessionFile?: string;
  /** Fork lineage across session files (`SessionInfo.parentSessionPath`). */
  parentSessionPath?: string;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

/** Image attachment passthrough — mirror of Pi `ImageContent`. */
export type PiInputAttachment = PiImageContent;

export type PiSendMessageInput = {
  content: string;
  attachments?: PiInputAttachment[];
  /** REQUIRED while the thread is running. Pi `prompt()` throws otherwise. */
  streamingBehavior?: "followUp" | "steer";
};

// ---------------------------------------------------------------------------
// Host UI requests — Pi's entire human-in-the-loop / approval surface
// (`ExtensionUIContext.confirm/select/input/editor`). These carry NO
// `toolCallId` from Pi; the supervisor may set `toolCallId` only when exactly
// one tool is executing (single-tool causality). Never guess from titles.
// ---------------------------------------------------------------------------

export type PiHostUiRequestKind = "confirm" | "select" | "input" | "editor";

export type PiHostUiRequest =
  | {
      id: string;
      kind: "confirm";
      title: string;
      message: string;
      toolCallId?: string;
      timeoutMs?: number;
    }
  | {
      id: string;
      kind: "select";
      title: string;
      options: readonly string[];
      toolCallId?: string;
      timeoutMs?: number;
    }
  | {
      id: string;
      kind: "input";
      title: string;
      placeholder?: string;
      toolCallId?: string;
      timeoutMs?: number;
    }
  | {
      id: string;
      kind: "editor";
      title: string;
      prefill?: string;
      toolCallId?: string;
      timeoutMs?: number;
    };

// Verified Pi return-type semantics (extensions/types.d.ts):
//   confirm → Promise<boolean>                (cancel/timeout = false = deny;
//                                              there is NO "cancelled" channel)
//   select / input / editor → Promise<string | undefined>  (undefined = dismissed)
export type PiHostUiResponse =
  | { requestId: string; confirmed: boolean }
  | { requestId: string; value: string }
  | { requestId: string; dismissed: true };

// ---------------------------------------------------------------------------
// Event model — isomorphic to Pi's `AgentSessionEvent` (= base `AgentEvent`
// plus session additions), with a `snapshot` framing event and host-UI events.
//
// Corrections vs. an idealized model, verified against the real `.d.ts`:
// - Base `turn_start`/`turn_end` carry NO `turnIndex`; the supervisor derives
//   and stamps `turnIndex` by counting `turn_start`s (used for `pi-turn:N`
//   step ids in projection).
// - `agent_end` carries `willRetry`.
// - The union is open: unknown event types must be stored, not thrown.
//
// Every event is wrapped with a `{ threadId, seq }` envelope by the supervisor.
// ---------------------------------------------------------------------------

export type PiClientEventBody =
  | { type: "snapshot"; snapshot: PiThreadSnapshot }
  | { type: "agent_start" }
  | { type: "agent_end"; willRetry?: boolean }
  | { type: "turn_start"; turnIndex: number }
  | { type: "turn_end"; turnIndex: number }
  | { type: "message_start"; message: PiAgentMessage }
  | {
      type: "message_update";
      message: PiAgentMessage;
      assistantMessageEvent: PiAssistantMessageDelta;
    }
  | { type: "message_end"; message: PiAgentMessage }
  | {
      type: "tool_execution_start";
      toolCallId: string;
      toolName: string;
      args: unknown;
    }
  | {
      type: "tool_execution_update";
      toolCallId: string;
      toolName?: string;
      partialResult: unknown;
    }
  | {
      type: "tool_execution_end";
      toolCallId: string;
      result: unknown;
      isError: boolean;
    }
  | {
      type: "queue_update";
      steering: readonly string[];
      followUp: readonly string[];
    }
  | { type: "compaction_start"; reason: "manual" | "threshold" | "overflow" }
  | { type: "compaction_end"; aborted: boolean; willRetry: boolean }
  | { type: "auto_retry_start"; attempt: number; delayMs: number }
  | { type: "auto_retry_end"; success: boolean }
  | { type: "session_info_changed"; name?: string }
  | { type: "thinking_level_changed"; level: string }
  | { type: "context_usage"; contextUsage: PiContextUsage }
  | { type: "extension_ui_request"; request: PiHostUiRequest }
  | { type: "extension_ui_resolved"; requestId: string }
  | { type: "error"; error: string };

/**
 * Forward-compatible fallback for augmented/unknown event types. The transport
 * delivers these cast as `PiClientEvent`; the reducer's `default` branch stores
 * the seq and otherwise ignores them (the controller decides whether to
 * full-refresh). Kept out of `PiClientEventBody` so the known union still
 * narrows by `type` in the reducer switch.
 */
export type PiUnknownClientEventBody = {
  type: string;
  [key: string]: unknown;
};

export type PiClientEventEnvelope = {
  threadId: string;
  /** Monotonic per-thread sequence for ordering/dedup. */
  seq: number;
};

export type PiClientEvent = PiClientEventBody & PiClientEventEnvelope;

/** Open variant used at the transport boundary (subscribe/SSE decode). */
export type PiAnyClientEvent =
  | PiClientEvent
  | (PiUnknownClientEventBody & PiClientEventEnvelope);

// ---------------------------------------------------------------------------
// Snapshot & client contract.
// ---------------------------------------------------------------------------

export type PiThreadSnapshot = {
  metadata: PiThreadMetadata;
  messages: PiTranscriptMessage[];
  /** Pending blocking host-UI requests (survive reconnect — tracked on the
   * supervisor record, not the connection). */
  hostUiRequests?: readonly PiHostUiRequest[];
  readiness?: PiRuntimeReadiness;
  /** Last surfaced runtime/session error, if any. */
  lastError?: string;
};

export interface PiClient {
  listThreads(input?: {
    workspacePath?: string;
    includeArchived?: boolean;
  }): Promise<PiThreadMetadata[]>;
  createThread(input?: {
    workspacePath?: string;
    title?: string;
    initialMessage?: PiSendMessageInput;
  }): Promise<PiThreadSnapshot>;
  getThread(threadId: string): Promise<PiThreadSnapshot>;

  sendMessage(threadId: string, input: PiSendMessageInput): Promise<void>;
  cancelRun(threadId: string): Promise<void>;

  renameThread(threadId: string, title: string): Promise<void>;
  archiveThread?(threadId: string): Promise<void>;
  unarchiveThread?(threadId: string): Promise<void>;
  deleteThread?(threadId: string): Promise<void>;

  /** Answer a blocking extension UI request (the approval/permission surface). */
  respondToHostUiRequest(
    threadId: string,
    response: PiHostUiResponse,
  ): Promise<void>;

  /** Snapshot-first; replays nothing it can't (see Reconnect in the MVP plan). */
  subscribe(
    threadId: string,
    listener: (event: PiClientEvent) => void,
  ): () => void;
}
