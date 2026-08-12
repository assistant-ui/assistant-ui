import { useResource, resource } from "@assistant-ui/tap";
import type { AssistantRuntime } from "..";
import {
  baseRuntimeAdapterTransformScopes,
  ThreadListClient,
} from "../store/internal";
import {
  attachTransformScopes,
  useAssistantClientRef,
  useAssistantScopeEffect,
} from "@assistant-ui/store/client";
import { DataRenderers } from "./client/DataRenderers";
import { Tools } from "./client/Tools";

const useRuntimeAdapter = (runtime: AssistantRuntime) => {
  const clientRef = useAssistantClientRef();

  useAssistantScopeEffect(
    "modelContext",
    () =>
      runtime.registerModelContextProvider(clientRef.current!.modelContext()),
    [runtime],
  );

  return useResource(
    ThreadListClient({
      runtime: runtime.threads,
      __internal_assistantRuntime: runtime,
    }),
  );
};

export const RuntimeAdapter = resource(useRuntimeAdapter);

attachTransformScopes(useRuntimeAdapter, (scopes, parent) => {
  baseRuntimeAdapterTransformScopes(scopes, parent);

  if (!scopes.tools && parent.tools.source === null) {
    scopes.tools = Tools({});
  }

  if (!scopes.dataRenderers && parent.dataRenderers.source === null) {
    scopes.dataRenderers = DataRenderers();
  }
});
