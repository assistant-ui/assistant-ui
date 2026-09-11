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
  const base = useMemo(
    () =>
      createCloudThreadListAdapter(() => ({
        ...adapterRef.current,
        cloud,
      })),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the factory pins the cloud instance; changing callbacks are read from the committed ref
    [cloud],
  );

  const cloudRef = useMemo(
    () => ({
      get current() {
        return adapterRef.current.cloud ?? autoCloud!;
      },
    }),
    [],
  );

  const unstable_useAdapters = useCallback(
    function useCloudAdapters() {
      return useCloudRuntimeAdapters(cloudRef);
    },
    [cloudRef],
  );

  return useMemo<RemoteThreadListAdapter>(() => {
    if (base.unstable_useAdapters === undefined) return base;
    return {
      ...base,
      unstable_useAdapters,
    };
  }, [base, unstable_useAdapters]);
};
