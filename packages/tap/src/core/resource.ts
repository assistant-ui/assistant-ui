import type { Resource, ResourceElement } from "./types";
import { fnSymbol } from "./helpers/callResourceFn";

export function resource<R, A extends readonly unknown[]>(
  fn: (...args: A) => R,
): Resource<R, A> {
  const type = (...args: A): ResourceElement<R, A> => {
    return {
      type,
      args,
    };
  };

  type[fnSymbol] = fn;

  return type;
}
