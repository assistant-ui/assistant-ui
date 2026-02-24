import { resource, tapResource } from "@assistant-ui/tap";
import {
  RuntimeAdapterResource,
  baseRuntimeAdapterTransformScopes,
} from "@assistant-ui/core/store/internal";
import { attachTransformScopes } from "@assistant-ui/store";
import { Tools } from "../model-context";

export const RuntimeAdapter = resource(
  (...args: Parameters<typeof RuntimeAdapterResource>) =>
    tapResource(RuntimeAdapterResource(...args)),
);

attachTransformScopes(RuntimeAdapter, (scopes, parent) => {
  const result = baseRuntimeAdapterTransformScopes(scopes, parent);

  if (!result.tools && parent.tools.source === null) {
    result.tools = Tools({});
  }

  return result;
});
