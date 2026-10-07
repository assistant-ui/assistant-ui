import type {
  AdkAuthRequest,
  AdkMessage,
  AdkMessageMetadata,
  AdkThreadSnapshot,
  AdkToolConfirmation,
} from "./types";

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
};

export type AdkThreadAction =
  | { type: "event.published"; state: AdkThreadState }
  | { type: "snapshot.applied"; snapshot: AdkThreadSnapshot }
  | { type: "messages.replaced"; messages: AdkMessage[] }
  | { type: "messages.set"; messages: AdkMessage[] }
  | { type: "longRunningToolIds.set"; ids: string[] }
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
});

export const reduceAdkThreadState = (
  state: AdkThreadState,
  action: AdkThreadAction,
): AdkThreadState => {
  switch (action.type) {
    case "event.published": {
      const next = action.state;
      return {
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
        messages: snapshot.messages,
        stateDelta: snapshot.stateDelta ?? {},
        agentInfo: snapshot.agentInfo ?? {},
        longRunningToolIds: snapshot.longRunningToolIds ?? [],
        artifactDelta: snapshot.artifactDelta ?? {},
        toolConfirmations: snapshot.toolConfirmations ?? [],
        authRequests: snapshot.authRequests ?? [],
        escalated: snapshot.escalated ?? false,
        messageMetadata: snapshot.messageMetadata ?? new Map(),
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
      };
    case "messages.set":
      return { ...state, messages: action.messages };
    case "longRunningToolIds.set":
      return { ...state, longRunningToolIds: action.ids };
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
