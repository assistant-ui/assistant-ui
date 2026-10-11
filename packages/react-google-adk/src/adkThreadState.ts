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

// Interrupts are answered through their own helpers, never as a held answer.
const INTERRUPT_TOOL_NAMES = new Set([
  ADK_REQUEST_CONFIRMATION,
  ADK_REQUEST_CREDENTIAL,
  "adk_request_input",
]);

export type AdkThreadState = {
  messages: AdkMessage[];
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
  | { type: "longRunningToolIds.set"; ids: string[] }
  | { type: "staged.stage"; entry: AdkStagedEntry }
  | { type: "staged.unstage"; ids: readonly string[] }
  | { type: "messages.remember"; messages: AdkMessage[]; runConfig: unknown }
  | { type: "messages.seed"; history: AdkMessage[] }
  | { type: "messages.prune"; history: AdkMessage[] }
  | { type: "run.active" }
  | { type: "run.finished"; runId: string }
  | { type: "run.cancelled" }
  | { type: "run.newTurn" }
  | { type: "results.received"; message: ToolMessage }
  | { type: "results.flush"; runId: string; failed: boolean }
  | { type: "results.clear" }
  | {
      type: "run.started";
      messages: AdkMessage[];
      longRunningToolIds: string[];
      toolConfirmations: AdkToolConfirmation[];
      authRequests: AdkAuthRequest[];
    };

export const createAdkThreadState = (): AdkThreadState => ({
  messages: [],
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

const releaseGroup = (
  state: AdkThreadState,
  buffer: Map<string, ToolMessage>,
  toolCallId: string,
): AdkThreadState => {
  const runId = state.runIdByToolCallId.get(toolCallId);
  if (runId && (state.activeRunIds.has(runId) || state.failedRunIds.has(runId)))
    return { ...state, toolResultBuffer: buffer, readyBatch: null };
  const group = runId
    ? orderedToolCallIds(state).filter(
        (id) => state.runIdByToolCallId.get(id) === runId,
      )
    : [toolCallId];
  if (!group.includes(toolCallId)) group.push(toolCallId);
  if (!group.every((id) => buffer.has(id)))
    return { ...state, toolResultBuffer: buffer, readyBatch: null };
  const readyBatch = group.map((id) => buffer.get(id)!);
  for (const id of group) buffer.delete(id);
  return { ...state, toolResultBuffer: buffer, readyBatch };
};

export const reduceAdkThreadState = (
  state: AdkThreadState,
  action: AdkThreadAction,
): AdkThreadState => {
  switch (action.type) {
    case "event.published": {
      const next = action.state;
      return {
        ...state,
        ...next,
        stateDelta: { ...state.stateDelta, ...next.stateDelta },
        artifactDelta: { ...state.artifactDelta, ...next.artifactDelta },
        messageMetadata:
          next.messageMetadata.size > 0
            ? new Map([...state.messageMetadata, ...next.messageMetadata])
            : state.messageMetadata,
      };
    }
    case "snapshot.applied": {
      const snapshot = action.snapshot;
      return {
        ...state,
        messages: snapshot.messages,
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
      const runConfigByToolCallId = new Map(state.runConfigByToolCallId);
      const runIdByToolCallId = new Map(state.runIdByToolCallId);
      const failedRunIds = new Set(state.failedRunIds);
      for (const message of action.messages) {
        if (message.type !== "ai") continue;
        if (
          state.currentRunId &&
          message.status?.type === "incomplete" &&
          message.status.reason === "error"
        )
          failedRunIds.add(state.currentRunId);
        for (const call of message.tool_calls ?? []) {
          if (!call || typeof call.id !== "string") continue;
          const isNewTool = !runConfigByToolCallId.has(call.id);
          if (isNewTool) runConfigByToolCallId.set(call.id, action.runConfig);
          if (state.currentRunId && isNewTool)
            runIdByToolCallId.set(call.id, state.currentRunId);
        }
      }
      return {
        ...state,
        runConfigByToolCallId,
        runIdByToolCallId,
        failedRunIds,
      };
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
      const buffer = new Map(state.toolResultBuffer);
      buffer.set(action.message.tool_call_id, action.message);
      return releaseGroup(state, buffer, action.message.tool_call_id);
    }
    case "results.flush": {
      if (action.failed)
        return {
          ...state,
          failedRunIds: new Set([...state.failedRunIds, action.runId]),
          readyBatch: null,
        };
      const first = [...state.toolResultBuffer.keys()].find(
        (id) => state.runIdByToolCallId.get(id) === action.runId,
      );
      return first
        ? releaseGroup(state, new Map(state.toolResultBuffer), first)
        : { ...state, readyBatch: null };
    }
    case "run.started":
      return {
        ...state,
        messages: action.messages,
        longRunningToolIds: action.longRunningToolIds,
        toolConfirmations: action.toolConfirmations,
        authRequests: action.authRequests,
      };
  }
};
