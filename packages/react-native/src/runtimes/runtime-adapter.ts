import {
  RuntimeAdapterResource,
  baseRuntimeAdapterTransformScopes,
} from "@assistant-ui/core/store/internal";
import { attachTransformScopes } from "@assistant-ui/store";

export const RuntimeAdapter = RuntimeAdapterResource;

attachTransformScopes(RuntimeAdapter, baseRuntimeAdapterTransformScopes);
