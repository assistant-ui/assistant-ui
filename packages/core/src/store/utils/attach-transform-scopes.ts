import type { ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantClient,
  ClientElement,
  ClientNames,
} from "../types/client";
import type { DerivedElement } from "./derived";

const TRANSFORM_SCOPES = Symbol("assistant-ui.transform-scopes");

export type ScopesConfig = {
  [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
};

type TransformScopesFn = (
  scopes: ScopesConfig,
  parent: AssistantClient,
) => ScopesConfig;

type ResourceWithTransformScopes = {
  [TRANSFORM_SCOPES]?: TransformScopesFn;
};

export function attachTransformScopes<
  T extends (...args: any[]) => ResourceElement<any>,
>(resource: T, transform: TransformScopesFn): void {
  const r = resource as T & ResourceWithTransformScopes;
  if (r[TRANSFORM_SCOPES]) {
    throw new Error("transformScopes is already attached to this resource");
  }
  r[TRANSFORM_SCOPES] = transform;
}

export function getTransformScopes<
  T extends (...args: any[]) => ResourceElement<any>,
>(resource: T): TransformScopesFn | undefined {
  return (resource as T & ResourceWithTransformScopes)[TRANSFORM_SCOPES];
}
