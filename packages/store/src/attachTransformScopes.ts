import type { ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantClient,
  ClientElement,
  ClientNames,
} from "./types/client";
import type { DerivedElement } from "./Derived";

const TRANSFORM_SCOPES = Symbol("assistant-ui.transform-scopes");

export type ScopesConfig = {
  [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
};

type TransformScopesFn = (
  scopes: ScopesConfig,
  parent: AssistantClient,
) => void;

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

export function forwardTransformScopes<
  T extends (...args: any[]) => ResourceElement<any>,
  S extends (...args: any[]) => ResourceElement<any>,
>(target: T, source: S): void {
  const sourceTransform = getTransformScopes(source);
  if (!sourceTransform) return;

  const r = target as T & ResourceWithTransformScopes;
  const existingTransform = r[TRANSFORM_SCOPES];
  if (existingTransform) {
    r[TRANSFORM_SCOPES] = (scopes, parent) => {
      sourceTransform(scopes, parent);
      existingTransform(scopes, parent);
    };
  } else {
    r[TRANSFORM_SCOPES] = sourceTransform;
  }
}

export function getTransformScopes<
  T extends (...args: any[]) => ResourceElement<any>,
>(resource: T): TransformScopesFn | undefined {
  return (resource as T & ResourceWithTransformScopes)[TRANSFORM_SCOPES];
}
