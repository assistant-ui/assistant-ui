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
  renderedClientRef: { current: AssistantClient | null };
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
  setup: (accessor: AssistantClientAccessor<K>) => void | (() => void),
  deps: readonly unknown[],
): void => {
  const { clientStoreRef, renderedClientRef } = useAssistantTapContext();
  const setupEvent = useEffectEvent(setup);
  const getRenderedClient = useEffectEvent(() => renderedClientRef.current);
  const stableDeps = useShallowStable(deps);

  useEffect(() => {
    const store = clientStoreRef.current;
    if (!store) throw new Error("Assistant client store is not available");

    const renderedClient = getRenderedClient();
    if (!renderedClient)
      throw new Error("Rendered assistant client is not available");

    const select = () => {
      const client = store.getValue().client;
      return {
        client,
        accessor: client[scope] as unknown as AssistantClientAccessor<K>,
      };
    };
    let selectedClient = renderedClient;
    let selected = renderedClient[
      scope
    ] as unknown as AssistantClientAccessor<K>;
    let cleanup: undefined | (() => void);
    let setupComplete = false;
    let disposed = false;
    let transitioning = true;
    let pending = false;
    const reportMigrationError = (error: unknown) => {
      queueMicrotask(() => {
        throw error;
      });
    };
    const setupSelected = () => {
      const nextCleanup =
        selected.source === null ? undefined : setupEvent(selected);
      if (disposed) {
        nextCleanup?.();
        return;
      }
      cleanup = typeof nextCleanup === "function" ? nextCleanup : undefined;
      setupComplete = true;
    };

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
          try {
            const next = select();
            if (Object.is(selected, next.accessor)) {
              const structurallyChanged = !Object.is(
                selectedClient,
                next.client,
              );
              selectedClient = next.client;
              if (setupComplete || !structurallyChanged) continue;
            }

            const previousCleanup = cleanup;
            cleanup = undefined;
            setupComplete = false;
            selectedClient = next.client;
            selected = next.accessor;
            previousCleanup?.();
            if (disposed) return;
            if (pending) {
              pending = false;
              const latest = select();
              selectedClient = latest.client;
              selected = latest.accessor;
            }
            setupSelected();
          } catch (error) {
            reportMigrationError(error);
          }
        } while (pending);
      } finally {
        transitioning = false;
      }
    };

    const unsubscribe = store.subscribe(migrate);
    try {
      setupSelected();
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
      setupComplete = false;
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
