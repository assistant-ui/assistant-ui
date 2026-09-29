import { useInsertionEffect, useRef, useState } from "react";
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

  const [cloudRef] = useState(() => ({
    get current() {
      return adapterRef.current.cloud ?? autoCloud!;
    },
  }));
  const [unstable_useAdapters] = useState(
    () =>
      function useCloudAdapters() {
        return useCloudRuntimeAdapters(cloudRef);
      },
  );

  const cloud = adapter.cloud ?? autoCloud;
  const createAdapter = (): RemoteThreadListAdapter => {
    // Construction registers this render's SDK on the new cloud; the adapter's callbacks read the committed options.
    let readOptions = () => adapter;
    const base = createCloudThreadListAdapter(() => ({
      ...readOptions(),
      cloud,
    }));
    readOptions = () => adapterRef.current;
    if (base.unstable_useAdapters === undefined) return base;
    return { ...base, unstable_useAdapters };
  };

  // The adapter lives in state keyed by its cloud because Fast Refresh recomputes memoized values, and a new adapter resets the thread list.
  const [pinned, setPinned] = useState(() => ({
    cloud,
    adapter: createAdapter(),
  }));
  if (pinned.cloud !== cloud) {
    const next = { cloud, adapter: createAdapter() };
    setPinned(next);
    return next.adapter;
  }
  return pinned.adapter;
};
