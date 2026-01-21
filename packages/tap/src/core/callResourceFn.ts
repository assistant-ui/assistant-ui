import { Resource } from "./types";

/**
 * Renders a resource with the given props.
 * @internal This is for internal use only.
 */
export function callResourceFn<R, P>(resource: Resource<R, P>, props: P): R {
  const fn = (resource as unknown as { [fnSymbol]?: (props: P) => R })[
    fnSymbol
  ];
  if (!fn) {
    throw new Error("tap: invalid resource element");
  }
  return fn(props);
}

/**
 * Symbol used to store the ResourceFn in the Resource constructor.
 * @internal This is for internal use only.
 */
export const fnSymbol = Symbol("fnSymbol");
