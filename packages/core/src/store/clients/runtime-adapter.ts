import { resource, tapEffect, tapResource } from "@assistant-ui/tap";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { ThreadListClient } from "../runtime-clients";
import {
  tapAssistantClientRef,
  Derived,
  type ScopesConfig,
  type AssistantClient,
} from "@assistant-ui/store";
import { ModelContext } from "./model-context-client";
import { Suggestions } from "./suggestions";

export const RuntimeAdapterResource = resource((runtime: AssistantRuntime) => {
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

export const baseRuntimeAdapterTransformScopes = (
  scopes: ScopesConfig,
  parent: AssistantClient,
): ScopesConfig => {
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
  if (!result.suggestions && parent.suggestions.source === null) {
    result.suggestions = Suggestions();
  }

  return result;
};
