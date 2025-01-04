import { useEffect, useMemo, useState } from "react";
import { ExternalStoreRuntimeCore } from "./ExternalStoreRuntimeCore";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import { AssistantRuntimeImpl } from "../../api/AssistantRuntime";
import { ThreadRuntimeImpl } from "../../api/ThreadRuntime";

export const useExternalStoreRuntime = <T,>(store: ExternalStoreAdapter<T>) => {
  const [runtime] = useState(() => new ExternalStoreRuntimeCore(store));

  useEffect(() => {
    runtime.setAdapter(store);
  });

  return useMemo(
    () => AssistantRuntimeImpl.create(runtime, ThreadRuntimeImpl),
    [runtime],
  );
};
