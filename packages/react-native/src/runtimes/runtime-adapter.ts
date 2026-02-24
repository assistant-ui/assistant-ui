import { resource, tapResource } from "@assistant-ui/tap";
import {
  RuntimeAdapterResource,
  baseRuntimeAdapterTransformScopes,
} from "@assistant-ui/core/store/internal";
import { attachTransformScopes } from "@assistant-ui/store";

export const RuntimeAdapter = resource(
  (...args: Parameters<typeof RuntimeAdapterResource>) =>
    tapResource(RuntimeAdapterResource(...args)),
);

attachTransformScopes(RuntimeAdapter, baseRuntimeAdapterTransformScopes);
