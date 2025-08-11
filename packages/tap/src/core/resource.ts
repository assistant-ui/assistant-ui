import {
  ResourceFn,
  ResourceElement,
  ResourceElementConstructor,
} from "./types";

export function resource<R, P>(
  type: ResourceFn<R, P>
): ResourceElementConstructor<R, P> {
  return (props: P, options?: { key?: string | number }) => {
    return {
      type,
      props,
      ...(options?.key !== undefined && { key: options.key }),
    } as ResourceElement<R, P>;
  };
}
