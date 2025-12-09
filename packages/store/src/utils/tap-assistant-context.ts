import {
  createContext,
  tapContext,
  withContextProvider,
  tapEffectEvent,
} from "@assistant-ui/tap";
import type {
  AssistantEventName,
  AssistantEventPayload,
} from "../types/events";
import type { AssistantClient } from "../types/client";
import { tapClientStack } from "./tap-client-stack-context";
import { EventManager } from "./EventManager";

export type AssistantTapContextValue = {
  clientRef: { parent: AssistantClient; current: AssistantClient | null };
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

export const tapAssistantClientRef = () => {
  return tapAssistantTapContext().clientRef;
};

export const tapAssistantEmit = () => {
  const { events } = tapAssistantTapContext();
  const clientStack = tapClientStack();

  return tapEffectEvent(
    <TEvent extends Exclude<AssistantEventName, "*">>(
      event: TEvent,
      payload: AssistantEventPayload[TEvent],
    ) => {
      events.emit(event, payload, clientStack);
    },
  );
};
