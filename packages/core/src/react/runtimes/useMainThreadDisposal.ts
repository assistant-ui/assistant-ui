import { useInsertionEffect, useState } from "react";
import type { AssistantRuntimeCore } from "../../runtime/interfaces/assistant-runtime-core";
import { disposeThreadRuntime } from "../../runtime/utils/thread-runtime-lifecycle";

export const useMainThreadDisposal = (runtime: AssistantRuntimeCore) => {
  const [host] = useState(() => ({ generation: 0 }));
  useInsertionEffect(() => {
    const generation = ++host.generation;
    return () =>
      queueMicrotask(() => {
        // Disconnect notifies subscribers, so keep it outside insertion cleanup.
        if (host.generation === generation)
          disposeThreadRuntime(runtime.threads.getMainThreadRuntimeCore());
      });
  }, [host, runtime]);
};
