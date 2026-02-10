import { resource, tapEffect, tapResource } from "@assistant-ui/tap";
import type { AssistantRuntime } from "./runtime/AssistantRuntime";
import { ThreadListClient } from "./client/ThreadListRuntimeClient";
import {
  tapAssistantClientRef,
  Derived,
  attachDefaultPeers,
} from "@assistant-ui/store";
import { ModelContext } from "../client/ModelContextClient";
import { Tools, Suggestions } from "../model-context";

export const RuntimeAdapter = resource((runtime: AssistantRuntime) => {
  const clientRef = tapAssistantClientRef();

  tapEffect(() => {
    return runtime.registerModelContextProvider(
      clientRef.current!.modelContext(),
    );
  }, [runtime, clientRef]);

  return tapResource(
    ThreadListClient({
      runtime: runtime.threads,
      __internal_assistantRuntime: runtime,
    }),
  );
});

attachDefaultPeers(RuntimeAdapter, {
  modelContext: ModelContext(),
  tools: Tools({}),
  suggestions: Suggestions(),
  threadListItem: Derived({
    source: "threads",
    query: { type: "main" },
    get: (aui) => aui.threads().item("main"),
  }),
  thread: Derived({
    source: "threads",
    query: { type: "main" },
    get: (aui) => aui.threads().thread("main"),
  }),
  composer: Derived({
    source: "thread",
    query: {},
    get: (aui) => aui.threads().thread("main").composer(),
  }),
});
