import { useInsertionEffect, useRef, useState } from "react";
import type { RemoteThreadListAdapter } from "../../../runtimes/remote-thread-list/types";
import {
  autoCloud,
  createCommittedScopeRef,
  createCloudThreadListAdapter,
  type CloudThreadListAdapterOptions,
  useCloudRuntimeAdapters,
} from "./createCloudThreadListAdapter";

export const useCloudThreadListAdapter = (
  adapter: CloudThreadListAdapterOptions,
): RemoteThreadListAdapter => {
  const adapterRef = useRef(adapter);
  const [cloudRef] = useState(() => ({
    get current() {
      return adapterRef.current.cloud ?? autoCloud!;
    },
  }));
  const [scopeRef] = useState(() => createCommittedScopeRef(adapter.scopeId));
  useInsertionEffect(() => {
    adapterRef.current = adapter;
    scopeRef.update(adapter.scopeId);
  }, [adapter, scopeRef]);
  const [unstable_useAdapters] = useState(
    () =>
      function useCloudAdapters() {
        return useCloudRuntimeAdapters(cloudRef, scopeRef);
      },
  );

  const cloud = adapter.cloud ?? autoCloud;
  const scope = adapter.scopeId;
  const createAdapter = (): RemoteThreadListAdapter => {
    // Construction registers this render's SDK on the new cloud; the adapter's callbacks read the committed options.
    let readOptions = () => adapter;
    const base = createCloudThreadListAdapter(() => ({
      ...readOptions(),
      cloud,
      scopeId: scope,
    }));
    readOptions = () => adapterRef.current;
    if (base.unstable_useAdapters === undefined) return base;
    return { ...base, unstable_useAdapters };
  };

  // The adapter lives in state keyed by its cloud and scope because Fast Refresh recomputes memoized values, and a new adapter resets the thread list.
  const [pinned, setPinned] = useState(() => ({
    cloud,
    scope,
    adapter: createAdapter(),
  }));
  if (pinned.cloud !== cloud || pinned.scope !== scope) {
    const next = { cloud, scope, adapter: createAdapter() };
    setPinned(next);
    return next.adapter;
  }
  return pinned.adapter;
};
