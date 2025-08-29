"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalStoreRuntimeCore } from "./ExternalStoreRuntimeCore";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import {
  AssistantRuntime,
  AssistantRuntimeImpl,
} from "../../api/AssistantRuntime";
import { useRuntimeAdapters } from "../adapters/RuntimeAdapterProvider";

export const useExternalStoreRuntime = <T,>(
  store: ExternalStoreAdapter<T>,
  key?: string | number | undefined,
): AssistantRuntime => {
  const keyRef = useRef(key);
  const [runtime, setRuntime] = useState(() => new ExternalStoreRuntimeCore(store));

  // Reset runtime when key changes
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setRuntime(new ExternalStoreRuntimeCore(store));
    }
  }, [key, store]);

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
