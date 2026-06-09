import type { Resource } from "../types";

/**
 * Renders a resource with the given args.
 * @internal This is for internal use only.
 */
export function callResourceFn<R, A extends readonly unknown[]>(
  resource: Resource<R, A>,
  args: Readonly<A>,
): R {
  const fn = (
    resource as unknown as { [fnSymbol]?: (...args: Readonly<A>) => R }
  )[fnSymbol];
  if (!fn) {
    throw new Error("ResourceElement.type is not a valid Resource");
  }
  return fn(...args);
}

/**
 * Symbol used to store the ResourceFn in the Resource constructor.
 * @internal This is for internal use only.
 */
export const fnSymbol = Symbol("fnSymbol");
