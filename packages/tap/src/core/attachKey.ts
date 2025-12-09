import { ResourceElement } from "./types";

export function attachKey<E extends ResourceElement<any, any>>(
  key: string | number,
  element: E,
): E {
  return { ...element, key };
}
