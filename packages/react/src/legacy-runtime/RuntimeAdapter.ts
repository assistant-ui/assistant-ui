import { resource, tapEffect, tapInlineResource } from "@assistant-ui/tap";
import type { AssistantRuntime } from "./runtime/AssistantRuntime";
import { ThreadListClient } from "./client/ThreadListRuntimeClient";
import { tapModelContext } from "../client/ModelContext";

export const RuntimeAdapter = resource((runtime: AssistantRuntime) => {
  const modelContext = tapModelContext();

  tapEffect(() => {
    return runtime.registerModelContextProvider(modelContext);
  }, [runtime, modelContext]);

  return tapInlineResource(
    ThreadListClient({
      runtime: runtime.threads,
      __internal_assistantRuntime: runtime,
    }),
  );
});
