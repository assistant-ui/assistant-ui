import { resource, tapResource } from "@assistant-ui/tap";
import type { AssistantRuntime } from "..";
import {
  RuntimeAdapterResource,
  baseRuntimeAdapterTransformScopes,
} from "../store/internal";
import { attachTransformScopes } from "@assistant-ui/store";
import { DataRenderers } from "./client/DataRenderers";
import { Tools } from "./client/Tools";

export const RuntimeAdapter = resource((runtime: AssistantRuntime) =>
  tapResource(RuntimeAdapterResource(runtime)),
);

attachTransformScopes(RuntimeAdapter, (scopes, parent) => {
  baseRuntimeAdapterTransformScopes(scopes, parent);

  if (!scopes.tools && parent.tools.source === null) {
    scopes.tools = Tools({});
  }

  if (!scopes.dataRenderers && parent.dataRenderers.source === null) {
    scopes.dataRenderers = DataRenderers();
  }
});
