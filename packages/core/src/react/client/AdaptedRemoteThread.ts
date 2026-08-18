import { useMemo, useRef } from "react";
import { resource, type ResourceElement } from "@assistant-ui/tap";
import { useClientResource } from "@assistant-ui/store/client";
import type { ClientOutput } from "@assistant-ui/store";
import type { RuntimeAdapters } from "../../runtimes/remote-thread-list/types";
import {
  useRuntimeAdapters,
  useRuntimeAdaptersProvider,
} from "../runtimes/useRuntimeAdapters";

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

const useAdaptedRemoteThread = ({
  useAdapters,
  thread,
}: {
  useAdapters: () => RuntimeAdapters | null | undefined;
  thread: ResourceElement<ClientOutput<"thread">>;
}): ClientOutput<"thread"> => {
  const parent = useRuntimeAdapters();
  const adapters = useAdapters();
  const stableAdapters = useRef(adapters);
  if (!adaptersShallowEqual(stableAdapters.current, adapters)) {
    stableAdapters.current = adapters;
  }
  const merged = useMemo(
    () =>
      stableAdapters.current == null
        ? parent
        : { ...parent, ...stableAdapters.current },
    [parent],
  );
  return useRuntimeAdaptersProvider(merged, function useBoundRemoteThread() {
    return useClientResource(thread).methods;
  });
};

export const AdaptedRemoteThread = resource(useAdaptedRemoteThread);
