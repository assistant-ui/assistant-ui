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

export const tapClient = () => {
  return tapAssistantTapContext().client;
};

export const tapEmit = () => {
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
