import { useInsertionEffect, useState } from "react";
import type { AssistantRuntimeCore } from "../../runtime/interfaces/assistant-runtime-core";
import { disposeThreadRuntime } from "../../runtime/utils/thread-runtime-lifecycle";

// React and tap clean up an insertion effect only when its host is deleted,
// never on a hidden <Activity> or a Strict Mode replay. Fast Refresh reruns
// the effect, cleanup then setup, and the setup cancels the disposal its
// cleanup queued. The microtask keeps the voice disconnect, which notifies
// subscribers, out of React's insertion phase.
export const useMainThreadDisposal = (runtime: AssistantRuntimeCore) => {
  const [host] = useState(() => ({ generation: 0 }));
  useInsertionEffect(() => {
    const generation = ++host.generation;
    return () =>
      queueMicrotask(() => {
        if (host.generation === generation)
          disposeThreadRuntime(runtime.threads.getMainThreadRuntimeCore());
      });
  }, [host, runtime]);
};
