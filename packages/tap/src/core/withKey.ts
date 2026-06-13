import type { ResourceElement } from "./types";

export function withKey<E extends ResourceElement<any, any>>(
  key: string | number,
  element: E,
  deps?: readonly unknown[],
): E {
  return deps ? { ...element, key, deps } : { ...element, key };
}
