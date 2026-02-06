import { tapReducerWithDerivedState } from "./tap-reducer";
import { depsShallowEqual } from "./utils/depsShallowEqual";

const memoReducer = () => {
  throw new Error("Memo reducer should not be called");
};

type MemoState<T> = { value: T; deps: readonly unknown[] };

export const tapMemo = <T>(fn: () => T, deps: readonly unknown[]): T => {
  const [state] = tapReducerWithDerivedState(
    memoReducer,
    (state: MemoState<T> | null): MemoState<T> => {
      if (state && depsShallowEqual(state.deps, deps)) return state;
      return { value: fn(), deps };
    },
    null,
  );
  return state.value;
};
