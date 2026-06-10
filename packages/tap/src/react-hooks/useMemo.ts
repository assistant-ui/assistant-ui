import { isDevelopment } from "../core/helpers/env";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { useReducerWithDerivedState } from "./useReducer";
import { depsShallowEqual } from "../hooks/utils/depsShallowEqual";

const memoReducer = () => {
  throw new Error("Memo reducer should not be called");
};

type MemoState<T> = { value: T; deps: readonly unknown[] };

export const useMemo = <T>(fn: () => T, deps: readonly unknown[]): T => {
  const fiber = getCurrentResourceFiber();
  const [state] = useReducerWithDerivedState(
    memoReducer,
    (state: MemoState<T> | null): MemoState<T> => {
      if (state && depsShallowEqual(state.deps, deps)) return state;

      const value = fn();

      if (isDevelopment && fiber.devStrictMode) {
        void fn();
      }

      return { value, deps };
    },
    null,
  );
  return state.value;
};
