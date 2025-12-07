import { ResourceElement, Resource } from "./types";
import { fnSymbol } from "./callResourceFn";
export function resource<R>(fn: () => R): () => ResourceElement<R, undefined>;
export function resource<R, P>(fn: (props: P) => R): Resource<R, P>;
export function resource<R, P = undefined>(
  fn: (props: P) => R,
): Resource<R, P> {
  const type = (props?: P) => {
    return {
      type,
      props: props!,
    } satisfies ResourceElement<R, P>;
  };

  type[fnSymbol] = fn;

  return type;
}
