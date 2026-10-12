import type { AppendMessage } from "@assistant-ui/core";
import type {
  AdkAuthRequest,
  AdkMessage,
  AdkMessageMetadata,
  AdkThreadSnapshot,
  AdkToolConfirmation,
} from "./types";
import { ADK_REQUEST_CREDENTIAL } from "./adkAuthRequest";
import { ADK_REQUEST_CONFIRMATION } from "./adkToolApproval";

export type AdkStagedEntry = {
  message: AdkMessage & { id: string };
  runConfig: AppendMessage["runConfig"];
};

type ToolMessage = Extract<AdkMessage, { type: "tool" }>;

export const normalizeSendConfig = (config: Record<PropertyKey, unknown>) =>
  Object.fromEntries(
    Reflect.ownKeys(config).map((key) => {
      const value = Reflect.get(config, key);
      return [
        key,
        value &&
        typeof value === "object" &&
        Reflect.ownKeys(value).length === 0
          ? undefined
          : value,
      ];
    }),
  );

// Interrupts are answered through their own helpers, so they never join a client call group.
export const INTERRUPT_TOOL_NAMES: ReadonlySet<string> = new Set([
  ADK_REQUEST_CONFIRMATION,
  ADK_REQUEST_CREDENTIAL,
  "adk_request_input",
]);

export const isInterruptReply = (
  messages: AdkMessage[],
  config: Record<PropertyKey, unknown>,
): messages is [ToolMessage] => {
  const normalizedConfig = normalizeSendConfig(config);
  return (
    messages.length === 1 &&
    messages[0]?.type === "tool" &&
    INTERRUPT_TOOL_NAMES.has(messages[0].name) &&
    Reflect.ownKeys(normalizedConfig).every(
      (key) => Reflect.get(normalizedConfig, key) === undefined,
    )
  );
};

export type AdkThreadState = {
  messages: AdkMessage[];
  queuedMessageIds: ReadonlySet<string>;
  stateDelta: Record<string, unknown>;
  agentInfo: { name?: string | undefined; branch?: string | undefined };
  longRunningToolIds: string[];
  artifactDelta: Record<string, number>;
  toolConfirmations: AdkToolConfirmation[];
  authRequests: AdkAuthRequest[];
  escalated: boolean;
  messageMetadata: Map<string, AdkMessageMetadata>;
  stagedEntries: ReadonlyMap<string, AdkStagedEntry>;
  toolResultBuffer: ReadonlyMap<string, ToolMessage>;
  runConfigByToolCallId: ReadonlyMap<string, unknown>;
  runIdByToolCallId: ReadonlyMap<string, string>;
  currentRunId: string | null;
  nextRunId: number;
  activeRunIds: ReadonlySet<string>;
  failedRunIds: ReadonlySet<string>;
  readyBatch: ToolMessage[] | null;
};

export type AdkThreadAction =
  | {
      type: "event.published";
      state: Omit<
        AdkThreadState,
        | "queuedMessageIds"
        | "stagedEntries"
        | "toolResultBuffer"
        | "runConfigByToolCallId"
        | "runIdByToolCallId"
        | "currentRunId"
        | "nextRunId"
        | "activeRunIds"
        | "failedRunIds"
        | "readyBatch"
      >;
    }
  | { type: "snapshot.applied"; snapshot: AdkThreadSnapshot }
  | { type: "messages.replaced"; messages: AdkMessage[] }
  | { type: "messages.set"; messages: AdkMessage[] }
  | {
      type: "messages.queued";
      messages: AdkMessage[];
      ids: readonly string[];
    }
  | { type: "messages.queue.remove"; ids: readonly string[] }
  | { type: "longRunningToolIds.set"; ids: string[] }
  | { type: "staged.stage"; entry: AdkStagedEntry }
  | { type: "staged.unstage"; ids: readonly string[] }
  | { type: "messages.remember"; messages: AdkMessage[]; runConfig: unknown }
  | { type: "messages.seed"; history: AdkMessage[] }
  | { type: "messages.prune"; history: AdkMessage[] }
  | { type: "run.active" }
  | { type: "run.failed" }
  | {
      type: "run.preEventFailed";
      ownIds: readonly string[];
      longRunningToolIds: string[];
      toolConfirmations: AdkToolConfirmation[];
      authRequests: AdkAuthRequest[];
    }
  | { type: "run.finished"; runId: string }
  | { type: "run.cancelled" }
  | { type: "run.newTurn" }
  | { type: "results.received"; message: ToolMessage }
  | { type: "results.flush"; runId: string; failed: boolean }
  | { type: "results.clear" }
  | {
      type: "run.started";
      messages: AdkMessage[];
      queuedMessageIds: readonly string[];
      longRunningToolIds: string[];
      toolConfirmations: AdkToolConfirmation[];
      authRequests: AdkAuthRequest[];
    };

export const createAdkThreadState = (): AdkThreadState => ({
  messages: [],
  queuedMessageIds: new Set(),
  stateDelta: {},
  agentInfo: {},
  longRunningToolIds: [],
  artifactDelta: {},
  toolConfirmations: [],
  authRequests: [],
  escalated: false,
  messageMetadata: new Map(),
  stagedEntries: new Map(),
  toolResultBuffer: new Map(),
  runConfigByToolCallId: new Map(),
  runIdByToolCallId: new Map(),
  currentRunId: null,
  nextRunId: 0,
  activeRunIds: new Set(),
  failedRunIds: new Set(),
  readyBatch: null,
});

const orderedToolCallIds = (state: AdkThreadState): string[] => {
  const pending = new Set(state.longRunningToolIds);
  const ids: string[] = [];
  for (const message of state.messages) {
    if (message.type !== "ai") continue;
    for (const call of message.tool_calls ?? []) {
      if (!call || typeof call.id !== "string") continue;
      if (INTERRUPT_TOOL_NAMES.has(call.name)) continue;
      if (pending.has(call.id) && !ids.includes(call.id)) ids.push(call.id);
    }
  }
  return ids;
};

const groupOf = (state: AdkThreadState, toolCallId: string): string[] => {
  const message = state.messages.find(
    (m) =>
      m.type === "ai" && m.tool_calls?.some((call) => call?.id === toolCallId),
  );
  const calls = message?.type === "ai" ? (message.tool_calls ?? []) : [];
  const call = calls.find((c) => c?.id === toolCallId);
  if (!call || INTERRUPT_TOOL_NAMES.has(call.name)) return [toolCallId];

  const runId = state.runIdByToolCallId.get(toolCallId);
  const pending = new Set(state.longRunningToolIds);
  // A call loaded with the thread has no known run, so the calls of its
  // assistant message stand in for that run's group.
  const group = runId
    ? orderedToolCallIds(state).filter(
        (id) => state.runIdByToolCallId.get(id) === runId,
      )
    : calls.flatMap((c) =>
        c &&
        typeof c.id === "string" &&
        pending.has(c.id) &&
        !INTERRUPT_TOOL_NAMES.has(c.name)
          ? [c.id]
          : [],
      );
  return group.includes(toolCallId) ? group : [...group, toolCallId];
};

const takeGroup = (
  state: AdkThreadState,
  buffer: Map<string, ToolMessage>,
  toolCallId: string,
): ToolMessage[] => {
  if (state.activeRunIds.size > 0) return [];
  const group = groupOf(state, toolCallId);
  if (!group.every((id) => buffer.has(id))) return [];
  const batch = group.map((id) => buffer.get(id)!);
  for (const id of group) buffer.delete(id);
  return batch;
};

export const reduceAdkThreadState = (
  state: AdkThreadState,
  action: AdkThreadAction,
): AdkThreadState => {
  switch (action.type) {
    case "event.published": {
      const next = action.state;
      const merged = {
        ...state,
        ...next,
        stateDelta: { ...state.stateDelta, ...next.stateDelta },
        artifactDelta: { ...state.artifactDelta, ...next.artifactDelta },
        messageMetadata:
          next.messageMetadata.size > 0
            ? new Map([...state.messageMetadata, ...next.messageMetadata])
            : state.messageMetadata,
      };
      if (state.queuedMessageIds.size === 0) return merged;
      const publishedIds = new Set(next.messages.map((message) => message.id));
      const queuedMessages = state.messages.filter(
        (message) =>
          state.queuedMessageIds.has(message.id) &&
          !publishedIds.has(message.id),
      );
      return { ...merged, messages: [...next.messages, ...queuedMessages] };
    }
    case "snapshot.applied": {
      const snapshot = action.snapshot;
      return {
        ...state,
        messages: snapshot.messages,
        queuedMessageIds: new Set(),
        stateDelta: snapshot.stateDelta ?? {},
        agentInfo: snapshot.agentInfo ?? {},
        longRunningToolIds: snapshot.longRunningToolIds ?? [],
        artifactDelta: snapshot.artifactDelta ?? {},
        toolConfirmations: snapshot.toolConfirmations ?? [],
        authRequests: snapshot.authRequests ?? [],
        escalated: snapshot.escalated ?? false,
        messageMetadata: snapshot.messageMetadata ?? new Map(),
        toolResultBuffer: new Map(),
        runIdByToolCallId: new Map(),
        activeRunIds: new Set(),
        failedRunIds: new Set(),
        currentRunId: null,
        readyBatch: null,
      };
    }
    case "messages.replaced":
      return {
        ...state,
        messages: action.messages,
        queuedMessageIds: new Set(),
        longRunningToolIds: [],
        toolConfirmations: [],
        authRequests: [],
        escalated: false,
        messageMetadata: new Map(),
        toolResultBuffer: new Map(),
        runIdByToolCallId: new Map(),
        activeRunIds: new Set(),
        failedRunIds: new Set(),
        currentRunId: null,
        readyBatch: null,
      };
    case "messages.set":
      return { ...state, messages: action.messages };
    case "messages.queued":
      return {
        ...state,
        messages: action.messages,
        queuedMessageIds: new Set([...state.queuedMessageIds, ...action.ids]),
      };
    case "messages.queue.remove": {
      const removedIds = new Set(
        action.ids.filter((id) => state.queuedMessageIds.has(id)),
      );
      if (removedIds.size === 0) return state;
      return {
        ...state,
        messages: state.messages.filter(
          (message) => !removedIds.has(message.id),
        ),
        queuedMessageIds: new Set(
          [...state.queuedMessageIds].filter((id) => !removedIds.has(id)),
        ),
      };
    }
    case "longRunningToolIds.set":
      return { ...state, longRunningToolIds: action.ids };
    case "staged.stage": {
      const stagedEntries = new Map(state.stagedEntries);
      stagedEntries.set(action.entry.message.id, action.entry);
      return { ...state, stagedEntries };
    }
    case "staged.unstage": {
      if (!action.ids.some((id) => state.stagedEntries.has(id))) return state;
      const stagedEntries = new Map(state.stagedEntries);
      for (const id of action.ids) stagedEntries.delete(id);
      return { ...state, stagedEntries };
    }
    case "messages.remember": {
      const newIds = action.messages.flatMap((message) =>
        message.type === "ai"
          ? (message.tool_calls ?? []).flatMap((call) =>
              call &&
              typeof call.id === "string" &&
              !state.runConfigByToolCallId.has(call.id)
                ? [call.id]
                : [],
            )
          : [],
      );
      if (newIds.length === 0) return state;
      const runConfigByToolCallId = new Map(state.runConfigByToolCallId);
      const runIdByToolCallId = new Map(state.runIdByToolCallId);
      for (const id of newIds) {
        runConfigByToolCallId.set(id, action.runConfig);
        if (state.currentRunId) runIdByToolCallId.set(id, state.currentRunId);
      }
      return { ...state, runConfigByToolCallId, runIdByToolCallId };
    }
    case "messages.seed": {
      const runConfigByToolCallId = new Map<string, unknown>();
      for (const message of action.history) {
        if (message.type !== "ai") continue;
        for (const call of message.tool_calls ?? []) {
          if (!call || typeof call.id !== "string") continue;
          // Loaded ids must remain present even without a local owner because
          // streamed event windows use has() to avoid attributing them later.
          runConfigByToolCallId.set(
            call.id,
            state.runConfigByToolCallId.get(call.id),
          );
        }
      }
      return { ...state, runConfigByToolCallId };
    }
    case "messages.prune": {
      const ids = new Set(
        action.history.flatMap((message) =>
          message.type === "ai"
            ? (message.tool_calls ?? []).flatMap((call) =>
                call && typeof call.id === "string" ? [call.id] : [],
              )
            : [],
        ),
      );
      return {
        ...state,
        runConfigByToolCallId: new Map(
          [...state.runConfigByToolCallId].filter(([id]) => ids.has(id)),
        ),
        runIdByToolCallId: new Map(
          [...state.runIdByToolCallId].filter(([id]) => ids.has(id)),
        ),
      };
    }
    case "run.active": {
      const runId = String(state.nextRunId + 1);
      return {
        ...state,
        nextRunId: state.nextRunId + 1,
        currentRunId: runId,
        activeRunIds: new Set([...state.activeRunIds, runId]),
        readyBatch: null,
      };
    }
    case "run.failed":
      return state.currentRunId
        ? {
            ...state,
            failedRunIds: new Set([...state.failedRunIds, state.currentRunId]),
          }
        : state;
    case "run.preEventFailed": {
      const ownIds = new Set(action.ownIds);
      return {
        ...state,
        messages: state.messages.filter((message) => !ownIds.has(message.id)),
        longRunningToolIds: action.longRunningToolIds,
        toolConfirmations: action.toolConfirmations,
        authRequests: action.authRequests,
      };
    }
    case "run.finished": {
      const activeRunIds = new Set(state.activeRunIds);
      activeRunIds.delete(action.runId);
      return {
        ...state,
        activeRunIds,
        currentRunId:
          state.currentRunId === action.runId ? null : state.currentRunId,
        readyBatch: null,
      };
    }
    case "run.cancelled":
      return {
        ...state,
        toolResultBuffer: new Map(),
        activeRunIds: new Set(),
        failedRunIds: new Set(),
        currentRunId: null,
        readyBatch: null,
      };
    case "run.newTurn": {
      const ids = orderedToolCallIds(state);
      const ordered = [
        ...ids.filter((id) => state.toolResultBuffer.has(id)),
        ...[...state.toolResultBuffer.keys()].filter((id) => !ids.includes(id)),
      ];
      return {
        ...state,
        toolResultBuffer: new Map(),
        failedRunIds: new Set(),
        readyBatch: ordered.map((id) => state.toolResultBuffer.get(id)!),
      };
    }
    case "results.clear":
      return {
        ...state,
        toolResultBuffer: new Map(),
        failedRunIds: new Set(),
        readyBatch: null,
      };
    case "results.received": {
      const toolResultBuffer = new Map(state.toolResultBuffer);
      toolResultBuffer.set(action.message.tool_call_id, action.message);
      const batch = takeGroup(
        state,
        toolResultBuffer,
        action.message.tool_call_id,
      );
      return {
        ...state,
        toolResultBuffer,
        readyBatch: batch.length > 0 ? batch : null,
      };
    }
    case "results.flush": {
      const toolResultBuffer = new Map(state.toolResultBuffer);
      const batch: ToolMessage[] = [];
      let batchOwner: string | undefined;
      let batchMessageId: string | undefined;
      for (const id of state.toolResultBuffer.keys()) {
        if (!toolResultBuffer.has(id)) continue;
        const owner = state.runIdByToolCallId.get(id);
        if (action.failed && owner === action.runId) continue;
        const messageId =
          owner === undefined
            ? (state.messages.find(
                (message) =>
                  message.type === "ai" &&
                  message.tool_calls?.some((call) => call?.id === id),
              )?.id ?? id)
            : undefined;
        if (
          batch.length > 0 &&
          (owner !== batchOwner ||
            (owner === undefined && messageId !== batchMessageId))
        )
          continue;
        const ready = takeGroup(state, toolResultBuffer, id);
        if (ready.length === 0) continue;
        batchOwner = owner;
        batchMessageId = messageId;
        batch.push(...ready);
      }
      return {
        ...state,
        toolResultBuffer,
        readyBatch: batch.length > 0 ? batch : null,
      };
    }
    case "run.started": {
      const queuedMessageIds = new Set(state.queuedMessageIds);
      for (const id of action.queuedMessageIds) queuedMessageIds.delete(id);
      return {
        ...state,
        messages: action.messages,
        queuedMessageIds,
        longRunningToolIds: action.longRunningToolIds,
        toolConfirmations: action.toolConfirmations,
        authRequests: action.authRequests,
      };
    }
  }
};
