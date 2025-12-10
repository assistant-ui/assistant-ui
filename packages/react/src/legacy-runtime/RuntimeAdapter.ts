import { resource, tapEffect, tapInlineResource } from "@assistant-ui/tap";
import type { AssistantRuntime } from "./runtime/AssistantRuntime";
import { ThreadListClient } from "./client/ThreadListRuntimeClient";
import { tapAssistantClientRef } from "@assistant-ui/store";

export const RuntimeAdapter = resource((runtime: AssistantRuntime) => {
  const clientRef = tapAssistantClientRef();

  tapEffect(() => {
    return runtime.registerModelContextProvider(
      clientRef.current!.modelContext(),
    );
  }, [runtime]);

  return tapInlineResource(
    ThreadListClient({
      runtime: runtime.threads,
      __internal_assistantRuntime: runtime,
    }),
  );
});
