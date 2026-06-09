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

// Transforms are keyed by the resource's underlying hook (the function passed to
// `resource()`), since that is the identity a `ResourceElement` carries.
type Hook = (...args: any[]) => any;
type HookWithTransformScopes = Hook & {
  [TRANSFORM_SCOPES]?: TransformScopesFn;
};

export function attachTransformScopes(
  hook: Hook,
  transform: TransformScopesFn,
): void {
  const h = hook as HookWithTransformScopes;
  if (h[TRANSFORM_SCOPES]) {
    throw new Error("transformScopes is already attached to this resource");
  }
  h[TRANSFORM_SCOPES] = transform;
}

export function forwardTransformScopes(target: Hook, source: Hook): void {
  const sourceTransform = getTransformScopes(source);
  if (!sourceTransform) return;

  const t = target as HookWithTransformScopes;
  const existingTransform = t[TRANSFORM_SCOPES];
  if (existingTransform) {
    t[TRANSFORM_SCOPES] = (scopes, parent) => {
      sourceTransform(scopes, parent);
      existingTransform(scopes, parent);
    };
  } else {
    t[TRANSFORM_SCOPES] = sourceTransform;
  }
}

export function getTransformScopes(hook: Hook): TransformScopesFn | undefined {
  return (hook as HookWithTransformScopes)[TRANSFORM_SCOPES];
}
