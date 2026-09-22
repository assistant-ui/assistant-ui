"use client";

import {
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ExternalStoreRuntimeCore } from "../../runtimes/internal";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { AssistantRuntimeImpl } from "../../runtime/internal";
import {
  disposeThreadRuntime,
  invalidateThreadRuntime,
} from "../../runtime/utils/thread-runtime-lifecycle";
import { useRuntimeAdapters } from "./RuntimeAdapterProvider";

export const useExternalStoreRuntime = <T>(
  store: ExternalStoreAdapter<T>,
): AssistantRuntime => {
  const { modelContext, feedback } = useRuntimeAdapters() ?? {};
  const adaptedStore = useMemo(() => {
    if (!feedback || store.adapters?.feedback) return store;
    return {
      ...store,
      adapters: { ...store.adapters, feedback },
    };
  }, [feedback, store]);
  const [runtime] = useState(() => new ExternalStoreRuntimeCore(adaptedStore));
  const mounted = useRef(false);
  useEffect(() => {
    return () => {
      const thread = runtime.threads.getMainThreadRuntimeCore();
      invalidateThreadRuntime(thread);
    };
  }, [runtime]);

  useInsertionEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const thread = runtime.threads.getMainThreadRuntimeCore();
      queueMicrotask(() => {
        if (mounted.current) return;
        try {
          disposeThreadRuntime(thread);
        } catch (error) {
          console.error("[assistant-ui] voice cleanup failed:", error);
        }
      });
    };
  }, [runtime]);

  useEffect(() => {
    runtime.setAdapter(adaptedStore);
  });

  useEffect(() => {
    if (!modelContext) return undefined;
    return runtime.registerModelContextProvider(modelContext);
  }, [modelContext, runtime]);

  return useMemo(() => new AssistantRuntimeImpl(runtime), [runtime]);
};
