import type { RunConfig } from "@assistant-ui/core";
import type { ReadonlyJSONValue } from "assistant-stream/utils";

export type AgUiThreadState = {
  isRunning: boolean;
  isLoading: boolean;
  loadRequested: boolean;
  historyMutationGeneration: number;
  stateSnapshot: ReadonlyJSONValue | undefined;
  lastRunConfig: RunConfig | undefined;
  pendingResume: {
    owner: AbortController;
    messageIds: readonly string[];
  } | null;
  pendingA2uiResumeOwner: AbortController | null;
  pendingA2uiAction: Record<string, unknown> | undefined;
};

export type AgUiThreadAction =
  | { type: "runStarted" }
  | { type: "runFinished" }
  | { type: "loadRequested" }
  | { type: "loadStarted" }
  | { type: "loadFinished" }
  | { type: "historyMutationAdvanced" }
  | { type: "stateSnapshot"; snapshot: ReadonlyJSONValue }
  | { type: "resetState" }
  | { type: "runConfigRecorded"; runConfig: RunConfig }
  | { type: "resumeDeferred"; owner: AbortController; messageId: string }
  | { type: "resumeCleared" }
  | { type: "a2uiResumeDeferred"; owner: AbortController }
  | { type: "a2uiResumeCleared" }
  | { type: "a2uiActionDeferred"; action: Record<string, unknown> }
  | { type: "a2uiActionCleared" }
  | { type: "a2uiContinuationsCleared" }
  | { type: "resetThread" };

export const createAgUiThreadState = (): AgUiThreadState => ({
  isRunning: false,
  isLoading: false,
  loadRequested: false,
  historyMutationGeneration: 0,
  stateSnapshot: undefined,
  lastRunConfig: undefined,
  pendingResume: null,
  pendingA2uiResumeOwner: null,
  pendingA2uiAction: undefined,
});

export const reduceAgUiThreadState = (
  state: AgUiThreadState,
  action: AgUiThreadAction,
): AgUiThreadState => {
  switch (action.type) {
    case "runStarted":
      return state.isRunning ? state : { ...state, isRunning: true };
    case "runFinished":
      return !state.isRunning ? state : { ...state, isRunning: false };
    case "loadRequested":
      return state.loadRequested ? state : { ...state, loadRequested: true };
    case "loadStarted":
      return state.isLoading ? state : { ...state, isLoading: true };
    case "loadFinished":
      return !state.isLoading ? state : { ...state, isLoading: false };
    case "historyMutationAdvanced":
      return {
        ...state,
        historyMutationGeneration: state.historyMutationGeneration + 1,
      };
    case "stateSnapshot":
      return state.stateSnapshot === action.snapshot
        ? state
        : { ...state, stateSnapshot: action.snapshot };
    case "resetState":
      return state.stateSnapshot === undefined
        ? state
        : { ...state, stateSnapshot: undefined };
    case "runConfigRecorded":
      return state.lastRunConfig === action.runConfig
        ? state
        : { ...state, lastRunConfig: action.runConfig };
    case "resumeDeferred":
      return state.pendingResume?.owner === action.owner &&
        state.pendingResume.messageIds.includes(action.messageId)
        ? state
        : {
            ...state,
            pendingResume: {
              owner: action.owner,
              messageIds:
                state.pendingResume?.owner === action.owner
                  ? [...state.pendingResume.messageIds, action.messageId]
                  : [action.messageId],
            },
          };
    case "resumeCleared":
      return state.pendingResume === null
        ? state
        : { ...state, pendingResume: null };
    case "a2uiResumeDeferred":
      return state.pendingA2uiResumeOwner === action.owner
        ? state
        : { ...state, pendingA2uiResumeOwner: action.owner };
    case "a2uiResumeCleared":
      return state.pendingA2uiResumeOwner === null
        ? state
        : { ...state, pendingA2uiResumeOwner: null };
    case "a2uiActionDeferred":
      return state.pendingA2uiAction === action.action
        ? state
        : { ...state, pendingA2uiAction: action.action };
    case "a2uiActionCleared":
      return state.pendingA2uiAction === undefined
        ? state
        : { ...state, pendingA2uiAction: undefined };
    case "a2uiContinuationsCleared":
      return state.pendingA2uiResumeOwner === null &&
        state.pendingA2uiAction === undefined
        ? state
        : {
            ...state,
            pendingA2uiResumeOwner: null,
            pendingA2uiAction: undefined,
          };
    case "resetThread":
      return state.stateSnapshot === undefined &&
        state.pendingResume === null &&
        state.pendingA2uiResumeOwner === null &&
        state.pendingA2uiAction === undefined
        ? state
        : {
            ...state,
            stateSnapshot: undefined,
            pendingResume: null,
            pendingA2uiResumeOwner: null,
            pendingA2uiAction: undefined,
          };
  }
};
