import { ResourceElement, Resource } from "./types";
import { fnSymbol } from "./callResourceFn";
export function resource<R>(fn: () => R): () => ResourceElement<R, undefined>;
export function resource<R, P>(fn: (props: P) => R): Resource<R, P>;
export function resource<R, P = undefined>(
  fn: (props: P) => R,
): Resource<R, P> {
  const type = (props?: P, options?: { key?: string | number }) => {
    return {
      type,
      props: props!,
      ...(options?.key !== undefined && { key: options.key }),
    } satisfies ResourceElement<R, P>;
  };

  type[fnSymbol] = fn;

  return type;
}
