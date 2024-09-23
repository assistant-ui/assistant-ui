import { useEffect, useMemo, useState } from "react";
import { ExternalStoreRuntimeCore } from "./ExternalStoreRuntimeCore";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { ThreadRuntime } from "../../api/ThreadRuntime";

export const useExternalStoreRuntime = <T,>(store: ExternalStoreAdapter<T>) => {
  const [runtime] = useState(() => new ExternalStoreRuntimeCore(store));

  useEffect(() => {
    runtime.thread.store = store;
  });

  return useMemo(() => new AssistantRuntime(runtime, ThreadRuntime), [runtime]);
};
