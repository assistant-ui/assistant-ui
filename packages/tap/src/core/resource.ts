import { ResourceFn, ResourceElement, Resource } from "./types";
import { fnSymbol } from "./getResourceFn";

export function resource<R, P = undefined>(
  fn: ResourceFn<R, P>,
): Resource<R, P> {
  const type = (props?: P, options?: { key?: string | number }) => {
    return {
      type,
      props,
      ...(options?.key !== undefined && { key: options.key }),
    } as ResourceElement<R, P>;
  };

  type[fnSymbol] = fn;

  return type;
}
