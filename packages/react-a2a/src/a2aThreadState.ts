import {
  applyA2uiOperations,
  type A2uiState,
} from "@assistant-ui/generative-ui/a2ui";
import { a2uiPartsToOperations, isTerminalTaskState } from "./conversions";
import type {
  A2AAgentCard,
  A2AArtifact,
  A2AMessage,
  A2APart,
  A2ATask,
  A2ATaskArtifactUpdateEvent,
  A2ATaskStatusUpdateEvent,
} from "./types";

export type A2AThreadState = {
  currentTask: A2ATask | undefined;
  currentArtifacts: A2AArtifact[];
  a2uiState: A2uiState;
  a2uiMessageIds: ReadonlySet<string>;
  agentCard: A2AAgentCard | undefined;
  isRunning: boolean;
  isLoading: boolean;
  loadRequested: boolean;
  contextId: string | undefined;
};

export type A2AThreadAction =
  | { type: "statusUpdate"; event: A2ATaskStatusUpdateEvent }
  | { type: "artifactUpdate"; event: A2ATaskArtifactUpdateEvent }
  | { type: "taskSnapshot"; task: A2ATask }
  | { type: "a2uiMessage"; message: A2AMessage; replay?: boolean }
  | { type: "prepareRun" }
  | { type: "runStarted" }
  | { type: "runFinished" }
  | { type: "agentCardLoaded"; agentCard: A2AAgentCard }
  | { type: "loadRequested" }
  | { type: "loadStarted" }
  | { type: "loadFinished" }
  | { type: "contextLearned"; contextId: string | undefined }
  | { type: "resetContext"; contextId: string | undefined }
  | { type: "taskReplaced"; task: A2ATask }
  | { type: "reset" };

export const createA2AThreadState = (contextId?: string): A2AThreadState => ({
  currentTask: undefined,
  currentArtifacts: [],
  a2uiState: new Map(),
  a2uiMessageIds: new Set(),
  agentCard: undefined,
  isRunning: false,
  isLoading: false,
  loadRequested: false,
  contextId,
});

const normalizeArtifact = (artifact: A2AArtifact): A2AArtifact => ({
  ...artifact,
  parts: Array.isArray(artifact.parts) ? artifact.parts : [],
});

const applyParts = (
  state: A2AThreadState,
  parts: readonly A2APart[],
): A2AThreadState => {
  const operations = a2uiPartsToOperations(parts);
  if (operations.length === 0) return state;
  return {
    ...state,
    a2uiState: applyA2uiOperations(state.a2uiState, operations).state,
  };
};

const applyMessage = (
  state: A2AThreadState,
  message: A2AMessage,
  replay: boolean,
): A2AThreadState => {
  if (
    message.messageId &&
    replay &&
    state.a2uiMessageIds.has(message.messageId)
  )
    return state;
  const next = message.messageId
    ? {
        ...state,
        a2uiMessageIds: new Set([...state.a2uiMessageIds, message.messageId]),
      }
    : state;
  return applyParts(next, message.parts);
};

export const reduceA2AThreadState = (
  state: A2AThreadState,
  action: A2AThreadAction,
): A2AThreadState => {
  switch (action.type) {
    case "statusUpdate": {
      const { event } = action;
      const currentTask = state.currentTask
        ? { ...state.currentTask, status: event.status }
        : {
            id: event.taskId,
            contextId: event.contextId,
            status: event.status,
          };
      const next = {
        ...state,
        currentTask,
        contextId: event.contextId || state.contextId,
      };
      return event.status.message
        ? applyMessage(next, event.status.message, false)
        : next;
    }
    case "artifactUpdate": {
      const { artifact: input, append } = action.event;
      const artifact = normalizeArtifact(input);
      const index = state.currentArtifacts.findIndex(
        (current) => current.artifactId === artifact.artifactId,
      );
      const updated =
        index >= 0 && append
          ? {
              ...state.currentArtifacts[index]!,
              parts: [
                ...state.currentArtifacts[index]!.parts,
                ...artifact.parts,
              ],
            }
          : artifact;
      const currentArtifacts =
        index >= 0
          ? [
              ...state.currentArtifacts.slice(0, index),
              updated,
              ...state.currentArtifacts.slice(index + 1),
            ]
          : [...state.currentArtifacts, updated];
      return applyParts({ ...state, currentArtifacts }, artifact.parts);
    }
    case "taskSnapshot": {
      const { task } = action;
      const artifacts =
        task.artifacts === undefined
          ? undefined
          : Array.isArray(task.artifacts)
            ? task.artifacts.map(normalizeArtifact)
            : [];
      const history =
        task.history === undefined
          ? undefined
          : Array.isArray(task.history)
            ? task.history
            : [];
      const complete = history !== undefined && artifacts !== undefined;
      const artifactsToApply = complete
        ? artifacts
        : artifacts?.filter(
            (artifact) =>
              !state.currentArtifacts.some(
                ({ artifactId }) => artifactId === artifact.artifactId,
              ),
          );
      let next: A2AThreadState = {
        ...state,
        currentTask: {
          ...task,
          ...(artifacts === undefined ? {} : { artifacts }),
          ...(history === undefined ? {} : { history }),
        },
        contextId: task.contextId || state.contextId,
        currentArtifacts: complete
          ? artifacts!
          : artifactsToApply
            ? [...state.currentArtifacts, ...artifactsToApply]
            : state.currentArtifacts,
        a2uiState: complete ? new Map() : state.a2uiState,
        a2uiMessageIds: complete ? new Set() : state.a2uiMessageIds,
      };
      for (const message of history ?? []) {
        if (message.role === "agent") next = applyMessage(next, message, true);
      }
      for (const artifact of artifactsToApply ?? []) {
        next = applyParts(next, artifact.parts);
      }
      if (task.status.message) {
        next = applyMessage(next, task.status.message, true);
      }
      return next;
    }
    case "a2uiMessage":
      return applyMessage(state, action.message, action.replay ?? false);
    case "prepareRun":
      return {
        ...state,
        currentTask:
          state.currentTask &&
          isTerminalTaskState(state.currentTask.status.state)
            ? undefined
            : state.currentTask,
        currentArtifacts: [],
        a2uiState: new Map(),
        a2uiMessageIds: new Set(),
      };
    case "runStarted":
      return state.isRunning ? state : { ...state, isRunning: true };
    case "runFinished":
      return !state.isRunning ? state : { ...state, isRunning: false };
    case "agentCardLoaded":
      return state.agentCard === action.agentCard
        ? state
        : { ...state, agentCard: action.agentCard };
    case "loadRequested":
      return state.loadRequested ? state : { ...state, loadRequested: true };
    case "loadStarted":
      return state.isLoading ? state : { ...state, isLoading: true };
    case "loadFinished":
      return !state.isLoading ? state : { ...state, isLoading: false };
    case "contextLearned":
      return state.contextId === action.contextId
        ? state
        : { ...state, contextId: action.contextId };
    case "resetContext":
      return !state.isLoading && state.contextId === action.contextId
        ? state
        : { ...state, isLoading: false, contextId: action.contextId };
    case "taskReplaced":
      return state.currentTask === action.task
        ? state
        : { ...state, currentTask: action.task };
    case "reset":
      return {
        ...state,
        currentTask: undefined,
        currentArtifacts: [],
        a2uiState: new Map(),
        a2uiMessageIds: new Set(),
      };
  }
};
