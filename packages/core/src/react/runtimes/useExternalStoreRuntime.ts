"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalStoreRuntimeCore } from "../../runtimes/internal";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { AssistantRuntimeImpl } from "../../runtime/internal";
import { invalidateThreadRuntime } from "../../runtime/utils/thread-runtime-lifecycle";
import { useRuntimeAdapters } from "./RuntimeAdapterProvider";
import { ExternalStoreHistoryCopy } from "./external-store-history-copy";

export const useExternalStoreRuntime = <T>(
  store: ExternalStoreAdapter<T>,
): AssistantRuntime => {
  const { modelContext, feedback, history } = useRuntimeAdapters() ?? {};
  const [historyCopy] = useState(() => new ExternalStoreHistoryCopy());
  const copiesHistory =
    !!history?.unstable_copy &&
    !store.unstable_persistsHistory &&
    !store.adapters?.threadList;
  const adaptedStore = useMemo(() => {
    const withFeedback =
      feedback && !store.adapters?.feedback
        ? { ...store, adapters: { ...store.adapters, feedback } }
        : store;
    if (!copiesHistory || store.unstable_onRecordToolInteraction) {
      return withFeedback;
    }
    return {
      ...withFeedback,
      unstable_onRecordToolInteraction: historyCopy.recordInteraction,
    };
  }, [copiesHistory, feedback, historyCopy, store]);
  const [runtime] = useState(() => new ExternalStoreRuntimeCore(adaptedStore));

  useEffect(() => {
    return () => {
      invalidateThreadRuntime(runtime.threads.getMainThreadRuntimeCore());
    };
  }, [runtime]);

  useEffect(() => {
    runtime.setAdapter(adaptedStore);
  });

  useEffect(() => {
    if (!copiesHistory || !history) return;
    return historyCopy.attach(
      runtime.threads.getMainThreadRuntimeCore(),
      history,
    );
  }, [copiesHistory, history, historyCopy, runtime]);

  useEffect(() => {
    if (!modelContext) return undefined;
    return runtime.registerModelContextProvider(modelContext);
  }, [modelContext, runtime]);

  return useMemo(() => new AssistantRuntimeImpl(runtime), [runtime]);
};
