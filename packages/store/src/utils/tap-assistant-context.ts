import { useEffect, useEffectEvent, use, createContext } from "react";
import { useContextProvider } from "@assistant-ui/tap";
import type {
  AssistantEventName,
  AssistantEventPayload,
} from "../types/events";
import type { AssistantClient, ClientNames } from "../types/client";
import { getClientInstanceId, isScopeAvailable } from "./client-accessor";
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

const UNAPPLIED = Symbol("aui.scope-effect-unapplied");

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
 * Runs a registration effect that follows the bound client instance of one
 * scope: when a structural change remounts or replaces that instance, the
 * previous cleanup runs and the effect runs again against the replacement.
 * Value updates on the same instance do not re-run it, and while the scope
 * is unavailable only cleanup runs, so the effect always executes against a
 * bound scope. A migration whose effect throws stays unapplied, so the next
 * notification retries it. The client ref is committed before effects run,
 * so reads through it inside the effect see the finalized client.
 */
export const useAssistantScopeEffect = (
  scope: ClientNames,
  effect: () => (() => void) | void,
  deps: readonly unknown[],
) => {
  const { clientRef } = useAssistantTapContext();

  useEffect(() => {
    const client = clientRef.current;
    if (client === null) {
      throw new Error(
        "useAssistantScopeEffect ran before the client was committed. This is likely an internal bug in assistant-ui.",
      );
    }

    const identityOf = () => {
      const accessor = clientRef.current?.[scope];
      return accessor !== undefined && isScopeAvailable(accessor)
        ? getClientInstanceId(accessor)
        : undefined;
    };

    // Distinguishes "this identity has a live registration" from "this
    // identity was last seen": a migration whose effect threw records
    // UNAPPLIED, so the next notification retries even when the identity
    // swings back to a previously registered client.
    let applied: ReturnType<typeof identityOf> | typeof UNAPPLIED = UNAPPLIED;
    let cleanup: (() => void) | undefined;
    const apply = (next: ReturnType<typeof identityOf>) => {
      cleanup?.();
      cleanup = undefined;
      applied = UNAPPLIED;
      if (next !== undefined) {
        const result = effect();
        cleanup = typeof result === "function" ? result : undefined;
      }
      applied = next;
    };

    apply(identityOf());

    const unsubscribe = client.subscribe(() => {
      const next = identityOf();
      if (next === applied) return;
      apply(next);
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
