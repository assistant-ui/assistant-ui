import { isDevelopment } from "../core/helpers/env";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { tapReducerWithDerivedState } from "./tap-reducer";
import { depsShallowEqual } from "./utils/depsShallowEqual";

const memoReducer = () => {
  throw new Error("Memo reducer should not be called");
};

type MemoState<T> = { value: T; deps: readonly unknown[] };

export const tapMemo = <T>(fn: () => T, deps: readonly unknown[]): T => {
  const fiber = getCurrentResourceFiber();
  const [state] = tapReducerWithDerivedState(
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
