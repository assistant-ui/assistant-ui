import type { Resource, ResourceElement } from "./types";

export function resource<R, A extends readonly unknown[]>(
  hook: (...args: A) => R,
): Resource<R, A> {
  return (...args: A): ResourceElement<R, A> => ({ hook, args });
}
