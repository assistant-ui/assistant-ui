import { tick } from "svelte";
import {
  AuiConfig,
  createAssistantClient,
  createClientFacade,
} from "@assistant-ui/store/client";
import type { AuiContext, ScopeTarget } from "../context";

export const scheduleExpiry = (callback: () => void) =>
  void tick().then(callback);

/**
 * Shared machinery for per-index item handles: hosts the built config as a
 * child client of the context and rides observation alone — the scope mounts
 * on the first subscriber, suspends once none remain, and resumes with state
 * intact. There is no destroy pairing (unlike `provideAui`'s lifetime
 * subscription). `build` receives an observation probe for stale reporters.
 */
export const createObservedItem = (
  context: AuiContext,
  build: (isObserved: () => boolean) => AuiConfig.Input,
): ScopeTarget => {
  let observers = 0;
  const handle = createAssistantClient(AuiConfig(build(() => observers > 0)), {
    parent: context.source,
  });

  const source = {
    getClient: handle.getClient,
    subscribe: (listener: () => void) => {
      // Increment only after a successful subscribe: the first one commits the
      // mount, which throws for a never-valid index and must not latch the
      // observer count
      const release = handle.subscribe(listener);
      observers++;
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        observers--;
        release();
      };
    },
  };
  return {
    source,
    aui: createClientFacade(source),
  };
};
