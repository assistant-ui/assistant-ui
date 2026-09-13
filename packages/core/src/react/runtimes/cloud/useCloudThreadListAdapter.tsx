import { useCallback, useInsertionEffect, useMemo, useRef } from "react";
import type { RemoteThreadListAdapter } from "../../../runtimes/remote-thread-list/types";
import {
  autoCloud,
  createCloudThreadListAdapter,
  setCloudThreadOwnership,
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
  const ownership = useMemo(
    () => ({ scope, ids: new Set<string>() }),
    [scope],
  ).ids;
  const base = useMemo(
    () => {
      const created = createCloudThreadListAdapter(() => ({
        ...adapterRef.current,
        cloud,
        scopeId: scope,
      }));
      setCloudThreadOwnership(created, ownership);
      return created;
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the factory pins the cloud instance; changing callbacks are read from the committed ref
    [cloud, ownership],
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
      return useCloudRuntimeAdapters(cloudRef, scopeRef, ownership);
    },
    [cloudRef, ownership, scopeRef],
  );

  return useMemo<RemoteThreadListAdapter>(() => {
    if (base.unstable_useAdapters === undefined) return base;
    const adapter = {
      ...base,
      unstable_useAdapters,
    };
    setCloudThreadOwnership(adapter, ownership);
    return adapter;
  }, [base, ownership, unstable_useAdapters]);
};
