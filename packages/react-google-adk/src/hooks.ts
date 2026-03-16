/// <reference types="@assistant-ui/core/store" />

import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  AdkMessage,
  AdkSendMessageConfig,
  AdkToolConfirmation,
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
