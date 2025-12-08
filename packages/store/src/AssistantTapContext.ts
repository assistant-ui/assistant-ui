import {
  createContext,
  tapContext,
  withContextProvider,
  tapEffectEvent,
} from "@assistant-ui/tap";
import type { AssistantEvent, AssistantEventMap, EventManager } from "./EventContext";
import type { AssistantClient } from "./types";
import { tapClientStack } from "./ClientStackContext";

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
 * Returns a stable emit function for emitting events from tap resources.
 * Automatically captures the current client stack at the time of calling.
 *
 * @example
 * ```typescript
 * const emit = tapEmitEvent();
 * emit("foo.updated", { id, newValue });
 * ```
 */
export const tapEmitEvent = () => {
  const { events } = tapAssistantTapContext();
  const clientStack = tapClientStack();

  return tapEffectEvent(
    <TEvent extends Exclude<AssistantEvent, "*">>(
      event: TEvent,
      payload: AssistantEventMap[TEvent],
    ) => {
      events.emit(event, payload, clientStack);
    },
  );
};
