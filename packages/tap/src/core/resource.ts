import { ResourceElement } from "./types";
import { fnSymbol } from "./helpers/callResourceFn";

export function resource<R>(fn: () => R): () => ResourceElement<R, undefined>;
export function resource<R, P>(
  fn: (props: P) => R,
): (props: P) => ResourceElement<R, P>;
export function resource<R, P>(
  fn: (props?: P) => R,
): (props?: P) => ResourceElement<R, P | undefined>;
export function resource<R, P = undefined>(fn: (props: P) => R) {
  const type = (props?: P) => {
    return {
      type,
      props: props!,
    } satisfies ResourceElement<R, P>;
  };

  type[fnSymbol] = fn;

  return type;
}
