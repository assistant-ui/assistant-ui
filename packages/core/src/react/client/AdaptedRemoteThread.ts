import { useEffect, useMemo } from "react";
import { resource, type ResourceElement } from "@assistant-ui/tap";
import { useClientResource } from "@assistant-ui/store/client";
import type { ClientOutput } from "@assistant-ui/store";
import type { RuntimeAdapters } from "../../runtimes/remote-thread-list/types";
import { isDevelopment } from "../../store/internal";
import {
  useRuntimeAdapters,
  useRuntimeAdaptersProvider,
  useStableRuntimeAdapters,
} from "../runtimes/useRuntimeAdapters";

const useAdaptedRemoteThread = ({
  useAdapters,
  thread,
}: {
  useAdapters: () => RuntimeAdapters | null | undefined;
  thread: ResourceElement<ClientOutput<"thread">>;
}): ClientOutput<"thread"> => {
  const parent = useRuntimeAdapters();
  const stableAdapters = useStableRuntimeAdapters(useAdapters());

  const unkeyedHistory =
    stableAdapters?.history != null && thread.key === undefined;
  useEffect(() => {
    if (!isDevelopment || !unkeyedHistory) return;
    console.warn(
      "[assistant-ui] RemoteThreadList received a history adapter, but the thread factory is unkeyed. Key the thread resource by thread id (withKey) so switching threads reloads history.",
    );
  }, [unkeyedHistory]);

  const merged = useMemo(
    () => (stableAdapters == null ? parent : { ...parent, ...stableAdapters }),
    [parent, stableAdapters],
  );
  return useRuntimeAdaptersProvider(merged, function useBoundRemoteThread() {
    return useClientResource(thread).methods;
  });
};

export const AdaptedRemoteThread = resource(useAdaptedRemoteThread);
