/**
 * Pure, incremental per-thread reducer.
 *
 * Design (PI_MVP_PLAN "Message Projection" / "Reconnect"):
 * - The canonical transcript is `PiAgentMessage[]`. A `snapshot` event replaces
 *   it wholesale and is **authoritative** — so the reducer never depends on
 *   fragile event ordering; any divergence self-heals on the next snapshot.
 * - Between snapshots, streaming events patch only the changed tail:
 *   `message_start` appends, `message_update` replaces the streaming assistant
 *   message in place (Pi guarantees `start` before partial updates), and
 *   `tool_execution_update` buffers live partial output by `toolCallId`.
 * - Unknown event types are tolerated: they bump `lastSeq` and are otherwise
 *   ignored (the controller layers a full-refresh fallback on top).
 *
 * This module is browser-safe and imports no `@earendil-works/*` packages.
 */

import type {
  PiAgentMessage,
  PiAssistantMessage,
  PiClientEvent,
  PiContextUsage,
  PiHostUiRequest,
  PiRuntimeReadiness,
  PiThreadMetadata,
  PiThreadSnapshot,
} from "./piTypes";

export type PiRunStatus = "idle" | "running" | "failed";

export type PiLoadState = "pending" | "loading" | "loaded";

export interface PiToolExecutionState {
  toolCallId: string;
  toolName?: string;
  args?: unknown;
  /** Latest streaming partial result (same shape as the final tool result:
   * `{ content: [{ type: "text", text }], details? }`). Superseded by the
   * `toolResult` message once it lands in the transcript. */
  partialResult?: unknown;
  status: "running" | "complete" | "error";
}

export interface PiThreadState {
  threadId: string;
  metadata: PiThreadMetadata;
  /** Canonical transcript — source of truth for projection. */
  messages: readonly PiAgentMessage[];
  /** Index into `messages` of the assistant message currently streaming, or
   * `undefined` when not streaming. */
  streamingMessageIndex: number | undefined;
  /** Live streaming tool output, keyed by `toolCallId`. */
  toolExecutions: Readonly<Record<string, PiToolExecutionState>>;
  runStatus: PiRunStatus;
  queue: { steering: readonly string[]; followUp: readonly string[] };
  contextUsage: PiContextUsage | undefined;
  compaction: { active: boolean; reason?: "manual" | "threshold" | "overflow" };
  retry: { active: boolean; attempt: number };
  /** Pending blocking host-UI requests (Pi's approval surface). */
  hostUiRequests: readonly PiHostUiRequest[];
  readiness: PiRuntimeReadiness | undefined;
  lastError: string | undefined;
  loadState: PiLoadState;
  /** Monotonic seq of the last applied event (for ordering/dedup). */
  lastSeq: number;
}

const EMPTY_METADATA = (threadId: string): PiThreadMetadata => ({
  id: threadId,
  status: "idle",
});

export const createPiThreadState = (threadId: string): PiThreadState => ({
  threadId,
  metadata: EMPTY_METADATA(threadId),
  messages: [],
  streamingMessageIndex: undefined,
  toolExecutions: {},
  runStatus: "idle",
  queue: { steering: [], followUp: [] },
  contextUsage: undefined,
  compaction: { active: false },
  retry: { active: false, attempt: 0 },
  hostUiRequests: [],
  readiness: undefined,
  lastError: undefined,
  loadState: "pending",
  lastSeq: 0,
});

const isAssistantMessage = (
  message: PiAgentMessage | undefined,
): message is PiAssistantMessage => message?.role === "assistant";

const withMetadataStatus = (
  metadata: PiThreadMetadata,
  status: PiThreadState["metadata"]["status"],
): PiThreadMetadata =>
  metadata.status === status ? metadata : { ...metadata, status };

const applySnapshot = (
  state: PiThreadState,
  snapshot: PiThreadSnapshot,
): PiThreadState => {
  const runStatus: PiRunStatus =
    snapshot.metadata.status === "running"
      ? "running"
      : snapshot.metadata.status === "failed"
        ? "failed"
        : "idle";

  return {
    ...state,
    metadata: snapshot.metadata,
    messages: snapshot.messages,
    // Snapshot is authoritative: drop transient streaming pointers/buffers so
    // any divergence self-heals.
    streamingMessageIndex: undefined,
    toolExecutions: {},
    runStatus,
    queue: {
      steering: snapshot.metadata.queuedMessages
        ? snapshot.metadata.queuedMessages
            .filter((m) => m.mode === "steer")
            .map((m) => m.content)
        : state.queue.steering,
      followUp: snapshot.metadata.queuedMessages
        ? snapshot.metadata.queuedMessages
            .filter((m) => m.mode === "followUp")
            .map((m) => m.content)
        : state.queue.followUp,
    },
    contextUsage: snapshot.metadata.contextUsage ?? state.contextUsage,
    hostUiRequests: snapshot.hostUiRequests ?? [],
    readiness: snapshot.readiness ?? state.readiness,
    lastError: snapshot.lastError,
    loadState: "loaded",
  };
};

const replaceAt = <T>(arr: readonly T[], index: number, value: T): T[] => {
  const next = arr.slice();
  next[index] = value;
  return next;
};

const upsertToolExecution = (
  state: PiThreadState,
  toolCallId: string,
  patch: Partial<PiToolExecutionState>,
): PiThreadState => ({
  ...state,
  toolExecutions: {
    ...state.toolExecutions,
    [toolCallId]: {
      toolCallId,
      status: "running",
      ...state.toolExecutions[toolCallId],
      ...patch,
    },
  },
});

const removeHostUiRequest = (
  state: PiThreadState,
  requestId: string,
): PiThreadState => {
  if (!state.hostUiRequests.some((r) => r.id === requestId)) return state;
  return {
    ...state,
    hostUiRequests: state.hostUiRequests.filter((r) => r.id !== requestId),
  };
};

/**
 * Apply a single client event. Pure: returns a new state (or the same reference
 * when nothing changed). Non-snapshot events older than `lastSeq` are ignored;
 * snapshots always apply (they are authoritative).
 */
export const reducePiThreadState = (
  state: PiThreadState,
  event: PiClientEvent,
): PiThreadState => {
  if (event.type !== "snapshot" && event.seq <= state.lastSeq) {
    return state;
  }

  const stamped = (next: PiThreadState): PiThreadState =>
    next === state && event.seq <= state.lastSeq
      ? next
      : { ...next, lastSeq: Math.max(state.lastSeq, event.seq) };

  switch (event.type) {
    case "snapshot":
      return stamped(applySnapshot(state, event.snapshot));

    case "agent_start":
      return stamped({
        ...state,
        runStatus: "running",
        lastError: undefined,
        metadata: withMetadataStatus(state.metadata, "running"),
      });

    case "agent_end": {
      const running = event.willRetry === true;
      return stamped({
        ...state,
        runStatus: running ? "running" : "idle",
        streamingMessageIndex: undefined,
        metadata: withMetadataStatus(
          state.metadata,
          running ? "running" : "idle",
        ),
      });
    }

    case "message_start": {
      const messages = [...state.messages, event.message];
      return stamped({
        ...state,
        messages,
        streamingMessageIndex: isAssistantMessage(event.message)
          ? messages.length - 1
          : state.streamingMessageIndex,
      });
    }

    case "message_update": {
      // The event carries the full current assistant message; replace the
      // streaming tail in place. If we somehow have no streaming pointer yet
      // (e.g. update before start), append it.
      if (
        state.streamingMessageIndex !== undefined &&
        state.streamingMessageIndex < state.messages.length
      ) {
        return stamped({
          ...state,
          messages: replaceAt(
            state.messages,
            state.streamingMessageIndex,
            event.message,
          ),
        });
      }
      const messages = [...state.messages, event.message];
      return stamped({
        ...state,
        messages,
        streamingMessageIndex: messages.length - 1,
      });
    }

    case "message_end": {
      if (
        state.streamingMessageIndex !== undefined &&
        state.streamingMessageIndex < state.messages.length
      ) {
        return stamped({
          ...state,
          messages: replaceAt(
            state.messages,
            state.streamingMessageIndex,
            event.message,
          ),
          streamingMessageIndex: undefined,
        });
      }
      return stamped({ ...state, streamingMessageIndex: undefined });
    }

    case "tool_execution_start":
      return stamped(
        upsertToolExecution(state, event.toolCallId, {
          toolName: event.toolName,
          args: event.args,
          status: "running",
        }),
      );

    case "tool_execution_update":
      return stamped(
        upsertToolExecution(state, event.toolCallId, {
          ...(event.toolName !== undefined ? { toolName: event.toolName } : {}),
          partialResult: event.partialResult,
          status: "running",
        }),
      );

    case "tool_execution_end":
      return stamped(
        upsertToolExecution(state, event.toolCallId, {
          partialResult: event.result,
          status: event.isError ? "error" : "complete",
        }),
      );

    case "queue_update":
      return stamped({
        ...state,
        queue: { steering: event.steering, followUp: event.followUp },
      });

    case "compaction_start":
      return stamped({
        ...state,
        compaction: { active: true, reason: event.reason },
      });

    case "compaction_end":
      return stamped({ ...state, compaction: { active: false } });

    case "auto_retry_start":
      return stamped({
        ...state,
        retry: { active: true, attempt: event.attempt },
      });

    case "auto_retry_end":
      return stamped({
        ...state,
        retry: { active: false, attempt: 0 },
      });

    case "context_usage":
      return stamped({ ...state, contextUsage: event.contextUsage });

    case "session_info_changed": {
      const metadata = { ...state.metadata };
      if (event.name !== undefined) metadata.title = event.name;
      else delete metadata.title;
      return stamped({ ...state, metadata });
    }

    case "extension_ui_request": {
      const exists = state.hostUiRequests.some(
        (r) => r.id === event.request.id,
      );
      if (exists) return stamped(state);
      return stamped({
        ...state,
        hostUiRequests: [...state.hostUiRequests, event.request],
      });
    }

    case "extension_ui_resolved":
      return stamped(removeHostUiRequest(state, event.requestId));

    case "error":
      return stamped({
        ...state,
        lastError: event.error,
        runStatus: "failed",
        metadata: withMetadataStatus(state.metadata, "failed"),
      });

    default:
      // Forward-compatible: unknown event types are tolerated (seq bumped via
      // `stamped`), the controller decides whether to full-refresh.
      return stamped(state);
  }
};
