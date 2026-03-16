import {
  createResourceContext,
  tap,
  withContextProvider,
  tapEffectEvent,
} from "@assistant-ui/tap";
import type {
  AssistantEventName,
  AssistantEventPayload,
} from "../types/events";
import type { AssistantClient } from "../types/client";
import { tapClientStack, type ClientStack } from "./tap-client-stack-context";

type EmitFn = <TEvent extends Exclude<AssistantEventName, "*">>(
  event: TEvent,
  payload: AssistantEventPayload[TEvent],
  clientStack: ClientStack,
) => void;

export type AssistantTapContextValue = {
  clientRef: { parent: AssistantClient; current: AssistantClient | null };
  emit: EmitFn;
};

const AssistantTapContext =
  createResourceContext<AssistantTapContextValue | null>(null);

export const withAssistantTapContextProvider = <TResult>(
  value: AssistantTapContextValue,
  fn: () => TResult,
) => {
  return withContextProvider(AssistantTapContext, value, fn);
};

const tapAssistantTapContext = () => {
  const ctx = tap(AssistantTapContext);
  if (!ctx) throw new Error("AssistantTapContext is not available");

  return ctx;
};

export const tapAssistantClientRef = () => {
  return tapAssistantTapContext().clientRef;
};

export const tapAssistantEmit = () => {
  const { emit } = tapAssistantTapContext();
  const clientStack = tapClientStack();

  return tapEffectEvent(
    <TEvent extends Exclude<AssistantEventName, "*">>(
      event: TEvent,
      payload: AssistantEventPayload[TEvent],
    ) => {
      emit(event, payload, clientStack);
    },
  );
};
