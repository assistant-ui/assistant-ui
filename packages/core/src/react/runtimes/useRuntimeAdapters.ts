import { createContext, type Context, useContext } from "react";
import { useContextProvider } from "@assistant-ui/tap";
import { useShallowStable } from "@assistant-ui/store/internal";
import type { RuntimeAdapters } from "../../runtimes/remote-thread-list/types";

const RUNTIME_ADAPTERS_CONTEXT_KEY = Symbol.for(
  "@assistant-ui/core.runtime-adapters-context",
);
const globalContexts = globalThis as unknown as Record<
  symbol,
  Context<RuntimeAdapters | null> | undefined
>;
const RuntimeAdaptersContext =
  globalContexts[RUNTIME_ADAPTERS_CONTEXT_KEY] ??
  (globalContexts[RUNTIME_ADAPTERS_CONTEXT_KEY] =
    createContext<RuntimeAdapters | null>(null));

export const useRuntimeAdaptersProvider = <T>(
  adapters: RuntimeAdapters | null,
  fn: () => T,
): T => useContextProvider(RuntimeAdaptersContext, adapters, fn);

export const useRuntimeAdapters = () => {
  return useContext(RuntimeAdaptersContext);
};

const NO_ADAPTERS: RuntimeAdapters = {};

// Both adapter faces absorb a fresh but shallow-equal bag from
// `unstable_useAdapters`, so a per-render literal does not churn the context.
export const useStableRuntimeAdapters = (
  adapters: RuntimeAdapters | null | undefined,
): RuntimeAdapters | null => {
  const stable = useShallowStable(adapters ?? NO_ADAPTERS);
  return adapters == null ? null : stable;
};

export { RuntimeAdaptersContext };
