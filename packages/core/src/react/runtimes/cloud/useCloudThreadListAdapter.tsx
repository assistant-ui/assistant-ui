import { useCallback, useMemo, useRef } from "react";
import type { RemoteThreadListAdapter } from "../../../runtimes/remote-thread-list/types";
import type { RuntimeAdapters } from "../RuntimeAdapterProvider";
import {
  autoCloud,
  createCloudThreadListAdapter,
  type CloudThreadListAdapterOptions,
} from "./createCloudThreadListAdapter";

export const useCloudThreadListAdapter = (
  adapter: CloudThreadListAdapterOptions,
): RemoteThreadListAdapter => {
  // Synced during render, not in an effect: the memo below recreates the
  // adapter in the same render a cloud swap arrives, and the factory pins the
  // cloud instance it reads at creation.
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  const cloud = adapter.cloud ?? autoCloud;
  const base = useMemo(
    () => createCloudThreadListAdapter(() => adapterRef.current),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the factory branches on the cloud instance; other options are read through the ref
    [cloud],
  );

  const baseRef = useRef(base);
  baseRef.current = base;

  const unstable_useAdapters = useCallback(function useCloudAdapters() {
    return baseRef.current.unstable_useAdapters!() as RuntimeAdapters;
  }, []);

  return useMemo<RemoteThreadListAdapter>(() => {
    if (base.unstable_useAdapters === undefined) return base;
    return {
      ...base,
      unstable_useAdapters,
    };
  }, [base, unstable_useAdapters]);
};
