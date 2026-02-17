import { resource, tapEffect, tapResource } from "@assistant-ui/tap";
import type { AssistantRuntime } from "./runtime/AssistantRuntime";
import { ThreadListClient } from "./client/ThreadListRuntimeClient";
import {
  tapAssistantClientRef,
  Derived,
  attachTransformScopes,
} from "@assistant-ui/store";
import { ModelContext } from "@assistant-ui/core/store";
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

attachTransformScopes(RuntimeAdapter, (scopes, parent) => {
  const result = {
    ...scopes,
    thread:
      scopes.thread ??
      Derived({
        source: "threads",
        query: { type: "main" },
        get: (aui) => aui.threads().thread("main"),
      }),
    threadListItem:
      scopes.threadListItem ??
      Derived({
        source: "threads",
        query: { type: "main" },
        get: (aui) => aui.threads().item("main"),
      }),
    composer:
      scopes.composer ??
      Derived({
        source: "thread",
        query: {},
        get: (aui) => aui.threads().thread("main").composer(),
      }),
  };

  if (!result.modelContext && parent.modelContext.source === null) {
    result.modelContext = ModelContext();
  }
  if (!result.tools && parent.tools.source === null) {
    result.tools = Tools({});
  }
  if (!result.suggestions && parent.suggestions.source === null) {
    result.suggestions = Suggestions();
  }

  return result;
});
