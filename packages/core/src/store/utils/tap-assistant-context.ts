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

const ASSISTANT_TAP_CONTEXT_SYMBOL = Symbol.for(
  "@assistant-ui/core/AssistantTapContext",
);
const ASSISTANT_TAP_CONTEXT_VALUE_SYMBOL = Symbol.for(
  "@assistant-ui/core/AssistantTapContextValue",
);

const globalWithContext = globalThis as typeof globalThis & {
  [ASSISTANT_TAP_CONTEXT_SYMBOL]?:
    | ReturnType<typeof createResourceContext<AssistantTapContextValue | null>>
    | undefined;
  [ASSISTANT_TAP_CONTEXT_VALUE_SYMBOL]?: AssistantTapContextValue | null;
};

const AssistantTapContext =
  globalWithContext[ASSISTANT_TAP_CONTEXT_SYMBOL] ??
  createResourceContext<AssistantTapContextValue | null>(null);

globalWithContext[ASSISTANT_TAP_CONTEXT_SYMBOL] = AssistantTapContext;

export const withAssistantTapContextProvider = <TResult>(
  value: AssistantTapContextValue,
  fn: () => TResult,
) => {
  const previous = globalWithContext[ASSISTANT_TAP_CONTEXT_VALUE_SYMBOL];
  globalWithContext[ASSISTANT_TAP_CONTEXT_VALUE_SYMBOL] = value;

  try {
    return withContextProvider(AssistantTapContext, value, fn);
  } finally {
    globalWithContext[ASSISTANT_TAP_CONTEXT_VALUE_SYMBOL] = previous ?? null;
  }
};

const tapAssistantTapContext = () => {
  const ctx =
    tap(AssistantTapContext) ??
    globalWithContext[ASSISTANT_TAP_CONTEXT_VALUE_SYMBOL];
  if (!ctx) {
    throw new Error("AssistantTapContext is not available");
  }

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
