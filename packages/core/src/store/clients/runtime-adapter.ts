import {
  Derived,
  type ScopesConfig,
  type AssistantClient,
} from "@assistant-ui/store";
import { ModelContext } from "./model-context-client";
import { Suggestions } from "./suggestions";

export const baseRuntimeAdapterTransformScopes = (
  scopes: ScopesConfig,
  parent: AssistantClient,
): void => {
  scopes.thread ??= Derived({
    source: "threads",
    query: { type: "main" },
    get: (aui) => aui.threads().thread("main"),
  });
  scopes.threadListItem ??= Derived({
    source: "threads",
    query: { type: "main" },
    get: (aui) => aui.threads().item("main"),
  });
  scopes.composer ??= Derived({
    source: "thread",
    query: {},
    get: (aui) => aui.threads().thread("main").composer(),
  });

  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
  if (!scopes.suggestions && parent.suggestions.source === null) {
    scopes.suggestions = Suggestions();
  }
};
