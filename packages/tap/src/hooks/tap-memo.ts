import { isDevelopment } from "../core/env";
import { getCurrentResourceFiber } from "../core/execution-context";
import { tapRef } from "./tap-ref";
import { depsShallowEqual } from "./utils/depsShallowEqual";

export const tapMemo = <T>(fn: () => T, deps: readonly unknown[]) => {
  const dataRef = tapRef<{ value: T; deps: readonly unknown[] }>();
  if (!dataRef.current) {
    if (isDevelopment) {
      const fiber = getCurrentResourceFiber();
      if (fiber.devStrictMode) {
        void fn();
      }
    }

    dataRef.current = { value: fn(), deps };
  }

  if (!depsShallowEqual(dataRef.current.deps, deps)) {
    dataRef.current.value = fn();
    dataRef.current.deps = deps;
  }

  return dataRef.current.value;
};
