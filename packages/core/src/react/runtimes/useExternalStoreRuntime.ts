"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalStoreRuntimeCore } from "../../runtimes/internal";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { AssistantRuntimeImpl } from "../../runtime/internal";
import { invalidateThreadRuntime } from "../../runtime/utils/thread-runtime-lifecycle";
import { useRuntimeAdapters } from "./RuntimeAdapterProvider";

export const useExternalStoreRuntime = <T>(
  store: ExternalStoreAdapter<T>,
): AssistantRuntime => {
  const [runtime] = useState(() => new ExternalStoreRuntimeCore(store));

  useEffect(() => {
    return () => {
      invalidateThreadRuntime(runtime.threads.getMainThreadRuntimeCore());
    };
  }, [runtime]);

  useEffect(() => {
    runtime.setAdapter(store);
  });

  const { modelContext } = useRuntimeAdapters() ?? {};

  useEffect(() => {
    if (!modelContext) return undefined;
    return runtime.registerModelContextProvider(modelContext);
  }, [modelContext, runtime]);

  return useMemo(() => new AssistantRuntimeImpl(runtime), [runtime]);
};
