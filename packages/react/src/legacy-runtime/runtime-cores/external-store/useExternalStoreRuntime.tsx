"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AssistantRuntime,
  AssistantRuntimeImpl,
} from "../../runtime/AssistantRuntime";
import { useRuntimeAdapters } from "../adapters/RuntimeAdapterProvider";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import { ExternalStoreRuntimeCore } from "./ExternalStoreRuntimeCore";

export const useExternalStoreRuntime = <T,>(
  store: ExternalStoreAdapter<T>,
): AssistantRuntime => {
  const [runtime] = useState(() => new ExternalStoreRuntimeCore(store));

  useEffect(() => {
    runtime.setAdapter(store);
  }, [runtime, store]);

  const { modelContext } = useRuntimeAdapters() ?? {};

  useEffect(() => {
    if (!modelContext) return undefined;
    return runtime.registerModelContextProvider(modelContext);
  }, [modelContext, runtime]);

  return useMemo(() => new AssistantRuntimeImpl(runtime), [runtime]);
};
