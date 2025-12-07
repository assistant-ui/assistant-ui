import {
  createContext,
  tapContext,
  withContextProvider,
} from "@assistant-ui/tap";
import type { EventManager } from "./EventContext";
import type { AssistantClient } from "./types";

export type AssistantTapContextValue = {
  client: AssistantClient;
  events: EventManager;
};

const AssistantTapContext = createContext<AssistantTapContextValue | null>(
  null,
);

export const withAssistantTapContextProvider = <TResult>(
  value: AssistantTapContextValue,
  fn: () => TResult,
) => {
  return withContextProvider(AssistantTapContext, value, fn);
};

const tapAssistantTapContext = () => {
  const ctx = tapContext(AssistantTapContext);
  if (!ctx) throw new Error("AssistantTapContext is not available");

  return ctx;
};

/**
 * Returns the AssistantClient from the tap context.
 * Use this to access the client from within tap resources.
 *
 * @example
 * ```typescript
 * const client = tapAssistantClient();
 * const fooState = client.foo().getState();
 * ```
 */
export const tapAssistantClient = () => {
  return tapAssistantTapContext().client;
};

/**
 * Returns the emit function for emitting events from tap resources.
 *
 * @example
 * ```typescript
 * const emit = tapEmitEvent();
 * emit("foo.updated", { id, newValue });
 * ```
 */
export const tapEmitEvent = () => {
  const { events } = tapAssistantTapContext();
  return events.emit;
};
