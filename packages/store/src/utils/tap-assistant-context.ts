import { useEffect, useEffectEvent, use, createContext } from "react";
import { useContextProvider } from "@assistant-ui/tap";
import type {
  AssistantEventName,
  AssistantEventPayload,
} from "../types/events";
import type { AssistantClient, ClientNames } from "../types/client";
import { getClientId, isScopeAvailable } from "./client-accessor";
import { useClientStack, type ClientStack } from "./tap-client-stack-context";

type EmitFn = <TEvent extends Exclude<AssistantEventName, "*">>(
  event: TEvent,
  payload: AssistantEventPayload[TEvent],
  clientStack: ClientStack,
) => void;

export type AssistantTapContextValue = {
  clientRef: { parent: AssistantClient; current: AssistantClient | null };
  emit: EmitFn;
};

const AssistantTapContext = createContext<AssistantTapContextValue | null>(
  null,
);

export const useAssistantTapContextProvider = <TResult>(
  value: AssistantTapContextValue,
  fn: () => TResult,
) => {
  return useContextProvider(AssistantTapContext, value, fn);
};

const useAssistantTapContext = () => {
  const ctx = use(AssistantTapContext);
  if (!ctx) throw new Error("AssistantTapContext is not available");

  return ctx;
};

export const useAssistantClientRef = () => {
  return useAssistantTapContext().clientRef;
};

/**
 * Runs a registration effect that follows the committed identity of one
 * scope: when a structural change replaces the scope's bound client, the
 * previous cleanup runs and the effect runs again against the replacement.
 * Value updates on the same binding do not re-run it. The client ref is
 * committed before effects run, so reads through it inside the effect see
 * the finalized client.
 */
export const useAssistantScopeEffect = (
  scope: ClientNames,
  effect: () => (() => void) | void,
  deps: readonly unknown[],
) => {
  const { clientRef } = useAssistantTapContext();

  useEffect(() => {
    const subscribe = clientRef.current?.subscribe;
    if (!subscribe) return;

    const identityOf = () => {
      const accessor = clientRef.current?.[scope];
      return accessor !== undefined && isScopeAvailable(accessor)
        ? getClientId(accessor)
        : undefined;
    };
    const setup = () => {
      const cleanup = effect();
      return typeof cleanup === "function" ? cleanup : undefined;
    };

    let identity = identityOf();
    let cleanup = setup();

    const unsubscribe = subscribe(() => {
      const next = identityOf();
      if (next === identity) return;
      identity = next;
      cleanup?.();
      cleanup = setup();
    });

    return () => {
      unsubscribe();
      cleanup?.();
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- deps is the caller's dependency list; the effect closure is intentionally read per deps generation
  }, [clientRef, scope, ...deps]);
};

export const useAssistantEmit = () => {
  const { emit } = useAssistantTapContext();
  const clientStack = useClientStack();

  return useEffectEvent(
    <TEvent extends Exclude<AssistantEventName, "*">>(
      event: TEvent,
      payload: AssistantEventPayload[TEvent],
    ) => {
      emit(event, payload, clientStack);
    },
  );
};
