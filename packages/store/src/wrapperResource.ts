import {
  type ResourceElement,
  type Resource,
  resource,
  withKey,
} from "@assistant-ui/tap";

export const wrapperResource = <R, P>(
  fn: (props: ResourceElement<P>) => R,
): Resource<R, ResourceElement<P>> => {
  // oxlint-disable-next-line tap-hooks/named-resource -- generic wrapper, forwards the caller's hook
  const res = resource(fn);
  return (props: ResourceElement<P>) => {
    const el = res(props);
    if (props.key === undefined) return el;
    return withKey(props.key, el);
  };
};
