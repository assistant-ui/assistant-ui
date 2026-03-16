/// <reference types="@assistant-ui/core/store" />

import { useAui, useAuiState } from "@assistant-ui/store";
import type { AdkMessage, AdkSendMessageConfig } from "./types";

export const symbolAdkRuntimeExtras = Symbol("adk-runtime-extras");

export type AdkRuntimeExtras = {
  [symbolAdkRuntimeExtras]: true;
  send: (messages: AdkMessage[], config: AdkSendMessageConfig) => Promise<void>;
  agentInfo: { name?: string | undefined; branch?: string | undefined };
  stateDelta: Record<string, unknown>;
  longRunningToolIds: string[];
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

export const useAdkAgentInfo = () => {
  const agentInfo = useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return undefined;
    return asAdkRuntimeExtras(extras).agentInfo;
  });
  return agentInfo;
};

export const useAdkSessionState = () => {
  const stateDelta = useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return {};
    return asAdkRuntimeExtras(extras).stateDelta;
  });
  return stateDelta;
};

export const useAdkSend = () => {
  const aui = useAui();
  return (messages: AdkMessage[], config: AdkSendMessageConfig) => {
    const extras = aui.thread().getState().extras;
    const { send } = asAdkRuntimeExtras(extras);
    return send(messages, config);
  };
};

export const useAdkLongRunningToolIds = () => {
  const longRunningToolIds = useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return [];
    return asAdkRuntimeExtras(extras).longRunningToolIds;
  });
  return longRunningToolIds;
};
