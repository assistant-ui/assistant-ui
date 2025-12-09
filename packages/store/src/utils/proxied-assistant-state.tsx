"use client";
import { getClientState } from "./ClientResource";
import type { AssistantClient, AssistantState } from "../types/client";

export const PROXIED_ASSISTANT_STATE_SYMBOL = Symbol(
  "assistant-ui.store.proxiedAssistantState",
);
/**
 * Proxied state that lazily accesses scope states
 */

export const createProxiedAssistantState = (
  client: AssistantClient,
): AssistantState => {
  return new Proxy({} as AssistantState, {
    get(_, prop) {
      const scope = prop as keyof AssistantClient;
      if (scope === "on") return undefined;
      if (scope === "subscribe") return undefined;

      return getClientState(client[scope]());
    },
  });
};

export const getProxiedAssistantState = (
  client: AssistantClient,
): AssistantState => {
  return (
    client as unknown as { [PROXIED_ASSISTANT_STATE_SYMBOL]: AssistantState }
  )[PROXIED_ASSISTANT_STATE_SYMBOL];
};
