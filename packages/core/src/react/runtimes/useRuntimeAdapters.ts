import { createContext, useContext, useRef } from "react";
import { useContextProvider } from "@assistant-ui/tap";
import type { RuntimeAdapters } from "../../runtimes/remote-thread-list/types";

const RuntimeAdaptersContext = createContext<RuntimeAdapters | null>(null);

export const useRuntimeAdaptersProvider = <T>(
  adapters: RuntimeAdapters | null,
  fn: () => T,
): T => useContextProvider(RuntimeAdaptersContext, adapters, fn);

export const useRuntimeAdapters = () => {
  return useContext(RuntimeAdaptersContext);
};

const adaptersShallowEqual = (
  a: RuntimeAdapters | null | undefined,
  b: RuntimeAdapters | null | undefined,
): boolean => {
  if (a == null || b == null) return a == null && b == null;
  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every(
      (key) =>
        Object.hasOwn(b, key) &&
        Object.is(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
    )
  );
};

// Both adapter faces absorb a fresh but shallow-equal bag from
// `unstable_useAdapters`, so a per-render literal does not churn the context.
export const useStableRuntimeAdapters = (
  adapters: RuntimeAdapters | null | undefined,
): RuntimeAdapters | null | undefined => {
  const ref = useRef(adapters);
  if (!adaptersShallowEqual(ref.current, adapters)) {
    ref.current = adapters;
  }
  return ref.current;
};

export { RuntimeAdaptersContext };
