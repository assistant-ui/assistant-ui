import { useEffect, useEffectEvent, use, createContext } from "react";
import { useContextProvider } from "@assistant-ui/tap";
import type {
  AssistantEventName,
  AssistantEventPayload,
} from "../types/events";
import type {
  AssistantClient,
  AssistantClientAccessor,
  ClientNames,
} from "../types/client";
import { useClientStack, type ClientStack } from "./tap-client-stack-context";
import { useShallowStable } from "./useShallowStable";

type EmitFn = <TEvent extends Exclude<AssistantEventName, "*">>(
  event: TEvent,
  payload: AssistantEventPayload[TEvent],
  clientStack: ClientStack,
) => void;

export type AssistantClientStoreRef = {
  current: {
    getValue(): { client: AssistantClient };
    subscribe(listener: () => void): () => void;
  } | null;
};

export type AssistantTapContextValue = {
  clientRef: { parent: AssistantClient; current: AssistantClient | null };
  clientStoreRef: AssistantClientStoreRef;
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

export const useAssistantClientEffect = <K extends ClientNames>(
  scope: K,
  setup: (accessor: AssistantClientAccessor<K>) => undefined | (() => void),
  deps: readonly unknown[],
): void => {
  const { clientStoreRef } = useAssistantTapContext();
  const setupEvent = useEffectEvent(setup);
  const stableDeps = useShallowStable(deps);

  useEffect(() => {
    const store = clientStoreRef.current;
    if (!store) throw new Error("Assistant client store is not available");

    const select = () =>
      store.getValue().client[scope] as AssistantClientAccessor<K>;
    let selected = select();
    let cleanup: undefined | (() => void);
    let disposed = false;
    let transitioning = true;
    let pending = false;
    const setupSelected = () =>
      selected.source === null ? undefined : setupEvent(selected);

    const migrate = () => {
      if (disposed) return;
      if (transitioning) {
        pending = true;
        return;
      }

      transitioning = true;
      try {
        do {
          pending = false;
          const next = select();
          if (Object.is(selected, next)) continue;

          const previousCleanup = cleanup;
          cleanup = undefined;
          selected = next;
          try {
            previousCleanup?.();
          } finally {
            cleanup = setupSelected();
          }
        } while (pending);
      } finally {
        transitioning = false;
      }
    };

    const unsubscribe = store.subscribe(migrate);
    try {
      cleanup = setupSelected();
    } catch (error) {
      disposed = true;
      unsubscribe();
      throw error;
    } finally {
      transitioning = false;
    }
    if (pending) migrate();

    return () => {
      disposed = true;
      unsubscribe();
      const finalCleanup = cleanup;
      cleanup = undefined;
      finalCleanup?.();
    };
  }, [clientStoreRef, scope, stableDeps]);
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
