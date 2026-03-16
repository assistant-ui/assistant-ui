/// <reference types="@assistant-ui/core/store" />

import { useAui, useAuiState } from "@assistant-ui/store";
import { v4 as uuidv4 } from "uuid";
import type {
  AdkMessage,
  AdkSendMessageConfig,
  AdkToolConfirmation,
  AdkAuthCredential,
  AdkAuthRequest,
  AdkMessageMetadata,
} from "./types";

export const symbolAdkRuntimeExtras = Symbol("adk-runtime-extras");

export type AdkRuntimeExtras = {
  [symbolAdkRuntimeExtras]: true;
  send: (messages: AdkMessage[], config: AdkSendMessageConfig) => Promise<void>;
  agentInfo: { name?: string | undefined; branch?: string | undefined };
  stateDelta: Record<string, unknown>;
  artifactDelta: Record<string, number>;
  longRunningToolIds: string[];
  toolConfirmations: AdkToolConfirmation[];
  authRequests: AdkAuthRequest[];
  escalated: boolean;
  messageMetadata: Map<string, AdkMessageMetadata>;
};

const asAdkRuntimeExtras = (extras: unknown): AdkRuntimeExtras => {
  if (
    typeof extras !== "object" ||
    extras == null ||
    !(symbolAdkRuntimeExtras in extras)
  )
    throw new Error(
      "This method can only be called when you are using useAdkRuntime",
    );

  return extras as AdkRuntimeExtras;
};

/** Returns the name and branch of the currently active ADK agent. */
export const useAdkAgentInfo = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return undefined;
    return asAdkRuntimeExtras(extras).agentInfo;
  });
};

/** Returns the accumulated session state delta from ADK events. */
export const useAdkSessionState = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return {};
    return asAdkRuntimeExtras(extras).stateDelta;
  });
};

/** Returns a function to send raw ADK messages. */
export const useAdkSend = () => {
  const aui = useAui();
  return (messages: AdkMessage[], config: AdkSendMessageConfig) => {
    const extras = aui.thread().getState().extras;
    const { send } = asAdkRuntimeExtras(extras);
    return send(messages, config);
  };
};

/** Returns the IDs of long-running tools awaiting external input. */
export const useAdkLongRunningToolIds = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return [];
    return asAdkRuntimeExtras(extras).longRunningToolIds;
  });
};

/** Returns pending tool confirmation requests (from SecurityPlugin etc). */
export const useAdkToolConfirmations = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return [];
    return asAdkRuntimeExtras(extras).toolConfirmations;
  });
};

/** Returns pending auth credential requests from tools. */
export const useAdkAuthRequests = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return [];
    return asAdkRuntimeExtras(extras).authRequests;
  });
};

/** Returns the accumulated artifact delta (filename → version). */
export const useAdkArtifacts = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return {};
    return asAdkRuntimeExtras(extras).artifactDelta;
  });
};

/** Returns whether any agent has escalated (requested human handoff). */
export const useAdkEscalation = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return false;
    return asAdkRuntimeExtras(extras).escalated;
  });
};

/** Returns per-message metadata (grounding, citation, usage). Keyed by message ID. */
export const useAdkMessageMetadata = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return new Map<string, AdkMessageMetadata>();
    return asAdkRuntimeExtras(extras).messageMetadata;
  });
};

// ── Convenience helpers for interactive flows ──

/** Returns a function to confirm or deny a pending tool confirmation. */
export const useAdkConfirmTool = () => {
  const aui = useAui();
  return (toolCallId: string, confirmed: boolean, payload?: unknown) => {
    const extras = aui.thread().getState().extras;
    const { send } = asAdkRuntimeExtras(extras);
    return send(
      [
        {
          id: uuidv4(),
          type: "tool",
          tool_call_id: toolCallId,
          name: "adk_request_confirmation",
          content: JSON.stringify({
            confirmed,
            ...(payload != null && { payload }),
          }),
          status: "success",
        },
      ],
      {},
    );
  };
};

/** Returns a function to submit auth credentials for a pending auth request. */
export const useAdkSubmitAuth = () => {
  const aui = useAui();
  return (toolCallId: string, credential: AdkAuthCredential) => {
    const extras = aui.thread().getState().extras;
    const { send } = asAdkRuntimeExtras(extras);
    return send(
      [
        {
          id: uuidv4(),
          type: "tool",
          tool_call_id: toolCallId,
          name: "adk_request_credential",
          content: JSON.stringify(credential),
          status: "success",
        },
      ],
      {},
    );
  };
};

// ── State prefix helpers ──

const APP_PREFIX = "app:";
const USER_PREFIX = "user:";
const TEMP_PREFIX = "temp:";

const filterByPrefix = (
  state: Record<string, unknown>,
  prefix: string,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(state)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length)] = state[key];
    }
  }
  return result;
};

/** Returns app-level state (keys prefixed with `app:`, prefix stripped). */
export const useAdkAppState = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return {};
    return filterByPrefix(asAdkRuntimeExtras(extras).stateDelta, APP_PREFIX);
  });
};

/** Returns user-level state (keys prefixed with `user:`, prefix stripped). */
export const useAdkUserState = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return {};
    return filterByPrefix(asAdkRuntimeExtras(extras).stateDelta, USER_PREFIX);
  });
};

/** Returns temp state (keys prefixed with `temp:`, prefix stripped). Not persisted. */
export const useAdkTempState = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return {};
    return filterByPrefix(asAdkRuntimeExtras(extras).stateDelta, TEMP_PREFIX);
  });
};
