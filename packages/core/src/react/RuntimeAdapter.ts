import { resource, tapResource } from "@assistant-ui/tap";
import type { AssistantRuntime } from "..";
import {
  RuntimeAdapterResource,
  baseRuntimeAdapterTransformScopes,
} from "../store/internal";
import { attachTransformScopes } from "@assistant-ui/store";
import { Tools } from "./model-context";

export const RuntimeAdapter = resource((runtime: AssistantRuntime) =>
  tapResource(RuntimeAdapterResource(runtime)),
);

attachTransformScopes(RuntimeAdapter, (scopes, parent) => {
  const result = baseRuntimeAdapterTransformScopes(scopes, parent);

  if (!result.tools && parent.tools.source === null) {
    result.tools = Tools({});
  }

  return result;
});
