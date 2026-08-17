import { useMemo } from "react";
import { resource, type ResourceElement } from "@assistant-ui/tap";
import { useClientResource } from "@assistant-ui/store/client";
import type { ClientOutput } from "@assistant-ui/store";
import type { RemoteThreadListAdapters } from "../../runtimes/remote-thread-list/types";
import {
  useRuntimeAdapters,
  useRuntimeAdaptersProvider,
} from "../runtimes/useRuntimeAdapters";

const useAdaptedRemoteThread = ({
  useAdapters,
  thread,
}: {
  useAdapters: () => RemoteThreadListAdapters | null | undefined;
  thread: ResourceElement<ClientOutput<"thread">>;
}): ClientOutput<"thread"> => {
  const parent = useRuntimeAdapters();
  const adapters = useAdapters();
  const merged = useMemo(
    () => (adapters == null ? parent : { ...parent, ...adapters }),
    [parent, adapters],
  );
  return useRuntimeAdaptersProvider(merged, function useBoundRemoteThread() {
    return useClientResource(thread).methods;
  });
};

export const AdaptedRemoteThread = resource(useAdaptedRemoteThread);
