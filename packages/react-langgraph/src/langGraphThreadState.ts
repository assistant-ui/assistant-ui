import type {
  LangChainMessage,
  LangChainMessageChunk,
  LangChainToolCall,
} from "./types";
import { bufferToolResult } from "./bufferToolResults";
import { hasToolResult } from "./messageHelpers";

type ToolMessage = LangChainMessage & { type: "tool" };
type OwnershipMessage =
  | LangChainMessage
  | (LangChainMessageChunk & { tool_calls?: LangChainToolCall[] });

export type LangGraphThreadState = {
  runConfigByMessageId: ReadonlyMap<string, unknown>;
  runConfigByToolCallId: ReadonlyMap<string, unknown>;
  runIdByMessageId: ReadonlyMap<string, string>;
  runIdByToolCallId: ReadonlyMap<string, string>;
  currentRunId: string | null;
  nextRunId: number;
  activeRunIds: ReadonlySet<string>;
  pendingToolCallIdsByRun: ReadonlyMap<string, readonly string[]>;
  // Buffers client tool results until every pending parallel call has a result,
  // so the graph resumes once with the complete batch. See bufferToolResult.
  toolResultBuffer: ReadonlyMap<string, ToolMessage>;
  // Sibling results arriving before a queued batch is sent merge into
  // `messages`; they remain pending because the thread transcript lacks them.
  // `queued` preserves the original batch identity while `messages` accumulates
  // later sibling results.
  pendingResume: ReadonlyMap<
    string,
    { queued: ToolMessage[]; messages: ToolMessage[] }
  >;
  autoCancelledToolCallTokens: ReadonlyMap<string, readonly LangChainMessage[]>;
  interruptRunConfig: unknown;
  // Top-level and subgraph error events both dispatch onError; subgraph errors
  // additionally dispatch onSubgraphError (see OnErrorEventCallback docs). The
  // balance is positive iff the run saw a top-level error, which drops any
  // sends queued behind it.
  runErrorBalance: number;
  readyBatch: ToolMessage[] | null;
  startedMessages: LangChainMessage[] | null;
};

export type LangGraphThreadAction =
  | {
      type: "messages.remember";
      messages: OwnershipMessage[];
      runConfig: unknown;
    }
  | { type: "messages.seed"; history: LangChainMessage[] }
  | { type: "messages.prune"; history: LangChainMessage[] }
  | { type: "messages.reconciled"; messages: LangChainMessage[] }
  | { type: "interrupt.set"; runConfig: unknown }
  | { type: "run.started"; messages: LangChainMessage[] }
  | { type: "run.finished"; runId: string }
  | { type: "run.error"; delta: number }
  | { type: "run.cancelled" }
  | { type: "run.initialLoad" }
  | { type: "run.newTurn" }
  | { type: "results.clear" }
  | { type: "results.buffer"; message: ToolMessage }
  | {
      type: "results.received";
      pendingCalls: { id: string }[];
      message: ToolMessage;
    }
  | {
      type: "results.flush";
      runId: string;
      expected: string[];
      failed: boolean;
    }
  | { type: "resume.enqueue"; groupKey: string; batch: ToolMessage[] }
  | { type: "resume.release"; groupKey: string; batch: ToolMessage[] }
  | { type: "resume.clear" }
  | { type: "cancellations.add"; messages: ToolMessage[] }
  | {
      type: "cancellations.remove";
      toolCallId: string;
      token?: readonly LangChainMessage[];
    };

export const createLangGraphThreadState = (): LangGraphThreadState => ({
  runConfigByMessageId: new Map(),
  runConfigByToolCallId: new Map(),
  runIdByMessageId: new Map(),
  runIdByToolCallId: new Map(),
  currentRunId: null,
  nextRunId: 0,
  activeRunIds: new Set(),
  pendingToolCallIdsByRun: new Map(),
  toolResultBuffer: new Map(),
  pendingResume: new Map(),
  autoCancelledToolCallTokens: new Map(),
  interruptRunConfig: undefined,
  runErrorBalance: 0,
  readyBatch: null,
  startedMessages: null,
});

export const reduceLangGraphThreadState = (
  state: LangGraphThreadState,
  action: LangGraphThreadAction,
): LangGraphThreadState => {
  switch (action.type) {
    case "messages.remember": {
      let runConfigByMessageId: Map<string, unknown> | undefined;
      let runConfigByToolCallId: Map<string, unknown> | undefined;
      let runIdByMessageId: Map<string, string> | undefined;
      let runIdByToolCallId: Map<string, string> | undefined;
      for (const message of action.messages) {
        if (message.type !== "ai" && message.type !== "AIMessageChunk")
          continue;
        let owner = action.runConfig;
        const isNewMessage = Boolean(
          message.id &&
          !(runConfigByMessageId ?? state.runConfigByMessageId).has(message.id),
        );
        if (message.id) {
          if (isNewMessage) {
            runConfigByMessageId ??= new Map(state.runConfigByMessageId);
            runConfigByMessageId.set(message.id, action.runConfig);
          }
          owner = (runConfigByMessageId ?? state.runConfigByMessageId).get(
            message.id,
          );
          if (state.currentRunId && isNewMessage) {
            runIdByMessageId ??= new Map(state.runIdByMessageId);
            runIdByMessageId.set(message.id, state.currentRunId);
          }
        }
        const toolCalls =
          message.type === "ai"
            ? (message.tool_calls ?? [])
            : [
                ...(message.tool_calls ?? []),
                ...(message.tool_call_chunks ?? []),
              ];
        for (const toolCall of toolCalls) {
          if (typeof toolCall !== "object" || toolCall === null || !toolCall.id)
            continue;
          const isNewTool = !(
            runConfigByToolCallId ?? state.runConfigByToolCallId
          ).has(toolCall.id);
          if (isNewTool) {
            runConfigByToolCallId ??= new Map(state.runConfigByToolCallId);
            runConfigByToolCallId.set(toolCall.id, owner);
          }
          if (state.currentRunId && isNewTool) {
            runIdByToolCallId ??= new Map(state.runIdByToolCallId);
            runIdByToolCallId.set(toolCall.id, state.currentRunId);
          }
        }
      }
      if (
        !runConfigByMessageId &&
        !runConfigByToolCallId &&
        !runIdByMessageId &&
        !runIdByToolCallId
      )
        return state;
      return {
        ...state,
        runConfigByMessageId:
          runConfigByMessageId ?? state.runConfigByMessageId,
        runConfigByToolCallId:
          runConfigByToolCallId ?? state.runConfigByToolCallId,
        runIdByMessageId: runIdByMessageId ?? state.runIdByMessageId,
        runIdByToolCallId: runIdByToolCallId ?? state.runIdByToolCallId,
      };
    }
    case "messages.seed": {
      const runConfigByMessageId = new Map(state.runConfigByMessageId);
      const runConfigByToolCallId = new Map(state.runConfigByToolCallId);
      for (const message of action.history) {
        if (message.type !== "ai") continue;
        let owner: unknown = undefined;
        if (message.id) {
          if (!runConfigByMessageId.has(message.id))
            runConfigByMessageId.set(message.id, undefined);
          owner = runConfigByMessageId.get(message.id);
        }
        for (const toolCall of message.tool_calls ?? []) {
          if (typeof toolCall !== "object" || toolCall === null || !toolCall.id)
            continue;
          if (!runConfigByToolCallId.has(toolCall.id))
            runConfigByToolCallId.set(toolCall.id, owner);
        }
      }
      return { ...state, runConfigByMessageId, runConfigByToolCallId };
    }
    case "messages.prune": {
      const messageIds = new Set<string>();
      const toolCallIds = new Set<string>();
      for (const message of action.history) {
        if (message.type !== "ai") continue;
        if (message.id) messageIds.add(message.id);
        for (const toolCall of message.tool_calls ?? []) {
          if (typeof toolCall === "object" && toolCall !== null && toolCall.id)
            toolCallIds.add(toolCall.id);
        }
      }
      return {
        ...state,
        runConfigByMessageId: new Map(
          [...state.runConfigByMessageId].filter(([id]) => messageIds.has(id)),
        ),
        runConfigByToolCallId: new Map(
          [...state.runConfigByToolCallId].filter(([id]) =>
            toolCallIds.has(id),
          ),
        ),
        runIdByMessageId: new Map(
          [...state.runIdByMessageId].filter(([id]) => messageIds.has(id)),
        ),
        runIdByToolCallId: new Map(
          [...state.runIdByToolCallId].filter(([id]) => toolCallIds.has(id)),
        ),
      };
    }
    case "messages.reconciled": {
      if (state.autoCancelledToolCallTokens.size === 0) return state;
      let autoCancelledToolCallTokens:
        | Map<string, readonly LangChainMessage[]>
        | undefined;
      for (const id of state.autoCancelledToolCallTokens.keys()) {
        if (hasToolResult(action.messages, id)) {
          autoCancelledToolCallTokens ??= new Map(
            state.autoCancelledToolCallTokens,
          );
          autoCancelledToolCallTokens.delete(id);
        }
      }
      return autoCancelledToolCallTokens
        ? { ...state, autoCancelledToolCallTokens }
        : state;
    }
    case "interrupt.set":
      return { ...state, interruptRunConfig: action.runConfig };
    case "run.started": {
      const runId = String(state.nextRunId + 1);
      const pendingResume = new Map(state.pendingResume);
      const pendingToolCallIdsByRun = new Map(state.pendingToolCallIdsByRun);
      let startedMessages: LangChainMessage[] = action.messages;
      for (const [groupKey, entry] of pendingResume) {
        if (entry.queued === action.messages) {
          startedMessages = entry.messages;
          pendingResume.delete(groupKey);
          if (groupKey.startsWith("run:"))
            pendingToolCallIdsByRun.delete(groupKey.slice(4));
          break;
        }
      }
      return {
        ...state,
        nextRunId: state.nextRunId + 1,
        currentRunId: runId,
        activeRunIds: new Set([...state.activeRunIds, runId]),
        pendingResume,
        pendingToolCallIdsByRun,
        runErrorBalance: 0,
        startedMessages,
      };
    }
    case "run.finished": {
      const activeRunIds = new Set(state.activeRunIds);
      activeRunIds.delete(action.runId);
      return { ...state, activeRunIds, startedMessages: null };
    }
    case "run.error":
      return {
        ...state,
        runErrorBalance: state.runErrorBalance + action.delta,
      };
    case "run.cancelled": {
      const toolResultBuffer = new Map(state.toolResultBuffer);
      const pendingToolCallIdsByRun = new Map(state.pendingToolCallIdsByRun);
      for (const toolCallId of toolResultBuffer.keys()) {
        const runId = state.runIdByToolCallId.get(toolCallId);
        if (runId && state.activeRunIds.has(runId))
          toolResultBuffer.delete(toolCallId);
      }
      for (const runId of state.activeRunIds)
        pendingToolCallIdsByRun.delete(runId);
      return {
        ...state,
        pendingResume: new Map(),
        autoCancelledToolCallTokens: new Map(),
        toolResultBuffer,
        pendingToolCallIdsByRun,
        activeRunIds: new Set(),
        startedMessages: null,
        readyBatch: null,
      };
    }
    case "run.initialLoad":
      return {
        ...state,
        toolResultBuffer: new Map(),
        autoCancelledToolCallTokens: new Map(),
        pendingToolCallIdsByRun: new Map(),
        activeRunIds: new Set(),
        runConfigByMessageId: new Map(),
        runConfigByToolCallId: new Map(),
        runIdByMessageId: new Map(),
        runIdByToolCallId: new Map(),
        interruptRunConfig: undefined,
        startedMessages: null,
        readyBatch: null,
      };
    case "run.newTurn":
      return {
        ...state,
        toolResultBuffer: new Map(),
        pendingToolCallIdsByRun: new Map(),
        pendingResume: new Map(),
        interruptRunConfig: undefined,
        readyBatch: null,
      };
    case "results.clear":
      return {
        ...state,
        toolResultBuffer: new Map(),
        pendingToolCallIdsByRun: new Map(),
        readyBatch: null,
      };
    case "results.buffer":
      return {
        ...state,
        toolResultBuffer: new Map(state.toolResultBuffer).set(
          action.message.tool_call_id,
          action.message,
        ),
        readyBatch: null,
      };
    case "results.received": {
      const toolResultBuffer = new Map(state.toolResultBuffer);
      const readyBatch = bufferToolResult(
        toolResultBuffer,
        action.pendingCalls,
        action.message,
      );
      return { ...state, toolResultBuffer, readyBatch };
    }
    case "results.flush": {
      if (action.expected.length === 0) return { ...state, readyBatch: null };
      const pendingToolCallIdsByRun = new Map(
        state.pendingToolCallIdsByRun,
      ).set(action.runId, action.expected);
      if (
        action.failed ||
        !action.expected.some((id) => state.toolResultBuffer.has(id)) ||
        !action.expected.every((id) => state.toolResultBuffer.has(id))
      )
        return { ...state, pendingToolCallIdsByRun, readyBatch: null };
      const toolResultBuffer = new Map(state.toolResultBuffer);
      const readyBatch = action.expected.map((id) => toolResultBuffer.get(id)!);
      for (const id of action.expected) toolResultBuffer.delete(id);
      return {
        ...state,
        pendingToolCallIdsByRun,
        toolResultBuffer,
        readyBatch,
      };
    }
    case "resume.enqueue": {
      const pendingResume = new Map(state.pendingResume);
      const queued = pendingResume.get(action.groupKey);
      if (queued) {
        const merged = [...queued.messages];
        for (const message of action.batch) {
          const index = merged.findIndex(
            (m) => m.tool_call_id === message.tool_call_id,
          );
          if (index >= 0) merged[index] = message;
          else merged.push(message);
        }
        pendingResume.set(action.groupKey, { ...queued, messages: merged });
      } else
        pendingResume.set(action.groupKey, {
          queued: action.batch,
          messages: action.batch,
        });
      return { ...state, pendingResume, readyBatch: null };
    }
    case "resume.release": {
      if (state.pendingResume.get(action.groupKey)?.queued !== action.batch)
        return state;
      const pendingResume = new Map(state.pendingResume);
      pendingResume.delete(action.groupKey);
      return { ...state, pendingResume };
    }
    case "resume.clear":
      return { ...state, pendingResume: new Map() };
    case "cancellations.add": {
      const autoCancelledToolCallTokens = new Map(
        state.autoCancelledToolCallTokens,
      );
      for (const message of action.messages)
        autoCancelledToolCallTokens.set(message.tool_call_id, action.messages);
      return { ...state, autoCancelledToolCallTokens };
    }
    case "cancellations.remove": {
      if (
        action.token &&
        state.autoCancelledToolCallTokens.get(action.toolCallId) !==
          action.token
      )
        return state;
      const autoCancelledToolCallTokens = new Map(
        state.autoCancelledToolCallTokens,
      );
      autoCancelledToolCallTokens.delete(action.toolCallId);
      return { ...state, autoCancelledToolCallTokens };
    }
  }
};
