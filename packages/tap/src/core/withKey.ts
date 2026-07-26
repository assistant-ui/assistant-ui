import type { Resource, ResourceElement } from "./types";

export function withKey<E extends ResourceElement<any>>(
  key: string | number,
  element: E,
  deps?: readonly unknown[],
): E;
export function withKey<F extends Resource<any, any[]>>(
  key: string | number,
  resource: F,
): F;
export function withKey(
  key: string | number,
  target: ResourceElement<any> | Resource<any, any[]>,
  deps?: readonly unknown[],
) {
  if (typeof target === "function") {
    return (...args: unknown[]) => withKey(key, target(...args));
  }
  return deps ? { ...target, key, deps } : { ...target, key };
}
