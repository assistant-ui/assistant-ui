import { ResourceFn, Resource } from "./types";

/**
 * Get the ResourceFn from a Resource constructor.
 * @internal This is for internal use only.
 */
export function getResourceFn<R, P>(
  resource: Resource<R, P>,
): ResourceFn<R, P> {
  const fn = (resource as unknown as { [fnSymbol]?: ResourceFn<R, P> })[
    fnSymbol
  ];
  if (!fn) {
    throw new Error("ResourceElement.type is not a valid Resource");
  }
  return fn;
}

/**
 * Symbol used to store the ResourceFn in the Resource constructor.
 * @internal This is for internal use only.
 */
export const fnSymbol = Symbol("fnSymbol");
