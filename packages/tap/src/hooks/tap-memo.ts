import { tapRef } from "./tap-ref";
import { depsShallowEqual } from "./depsShallowEqual";

export const tapMemo = <T>(fn: () => T, deps: readonly unknown[]) => {
  const dataRef = tapRef(() => ({
    value: fn(),
    deps,
  }));

  if (!depsShallowEqual(dataRef.current.deps, deps)) {
    dataRef.current.value = fn();
    dataRef.current.deps = deps;
  }

  return dataRef.current.value;
};
