import {
  type ResourceElement,
  Resource,
  resource,
  withKey,
} from "@assistant-ui/tap";

export const wrapperResource = <R, P>(
  fn: (props: ResourceElement<P>) => R,
): Resource<R, ResourceElement<P>> => {
  const res = resource(fn);
  return (props: ResourceElement<P>) => {
    const el = res(props);
    if (props.key === undefined) return el;
    return withKey(props.key, el);
  };
};
