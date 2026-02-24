import { resource, tapResource } from "@assistant-ui/tap";
import type { AssistantRuntime } from "@assistant-ui/core";
import {
  RuntimeAdapterResource,
  baseRuntimeAdapterTransformScopes,
} from "@assistant-ui/core/store/internal";
import { attachTransformScopes } from "@assistant-ui/store";

export const RuntimeAdapter = resource((runtime: AssistantRuntime) =>
  tapResource(RuntimeAdapterResource(runtime)),
);

attachTransformScopes(RuntimeAdapter, baseRuntimeAdapterTransformScopes);
