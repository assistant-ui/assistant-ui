import { useCallback, useInsertionEffect, useMemo, useRef } from "react";
import type { RemoteThreadListAdapter } from "../../../runtimes/remote-thread-list/types";
import {
  autoCloud,
  createCloudThreadListAdapter,
  type CloudThreadListAdapterOptions,
  useCloudRuntimeAdapters,
} from "./createCloudThreadListAdapter";

export const useCloudThreadListAdapter = (
  adapter: CloudThreadListAdapterOptions,
): RemoteThreadListAdapter => {
  const adapterRef = useRef(adapter);
  useInsertionEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  const cloud = adapter.cloud ?? autoCloud;
  const scope = adapter.scopeId;
  const base = useMemo(
    () =>
      createCloudThreadListAdapter(() => ({
        ...adapterRef.current,
        cloud,
        scopeId: scope,
      })),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the factory pins the cloud instance; changing callbacks are read from the committed ref
    [cloud, scope],
  );

  const cloudRef = useMemo(
    () => ({
      get current() {
        return adapterRef.current.cloud ?? autoCloud!;
      },
    }),
    [],
  );
  const scopeRef = useMemo(() => ({ current: scope }), [scope]);

  const unstable_useAdapters = useCallback(
    function useCloudAdapters() {
      return useCloudRuntimeAdapters(cloudRef, scopeRef);
    },
    [cloudRef, scopeRef],
  );

  return useMemo<RemoteThreadListAdapter>(() => {
    if (base.unstable_useAdapters === undefined) return base;
    return {
      ...base,
      unstable_useAdapters,
    };
  }, [base, unstable_useAdapters]);
};
