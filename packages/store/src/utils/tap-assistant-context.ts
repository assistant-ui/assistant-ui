import {
  createContext,
  tapContext,
  withContextProvider,
  tapEffectEvent,
} from "@assistant-ui/tap";
import type {
  AssistantEvent,
  AssistantEventMap,
  EventManager,
} from "../types/events";
import type { AssistantClient } from "../types/client";
import { tapClientStack } from "./tap-client-stack-context";

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

export const tapAssistantClient = () => {
  return tapAssistantTapContext().client;
};

export const tapEmitClientEvent = () => {
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
