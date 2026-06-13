import { useReducerImpl } from "./useReducer";

export namespace useState {
  export type StateUpdater<S> = S | ((prev: S) => S);
}

const stateReducer = <S>(
  state: S | undefined,
  action: useState.StateUpdater<S>,
): S =>
  typeof action === "function"
    ? (action as (prev: S | undefined) => S)(state)
    : action;

const stateInit = <S>(initial: S | (() => S)): S =>
  typeof initial === "function" ? (initial as () => S)() : initial;

export function useState<S = undefined>(): [
  S | undefined,
  (updater: useState.StateUpdater<S>) => void,
];
export function useState<S>(
  initial: S | (() => S),
): [S, (updater: useState.StateUpdater<S>) => void];
export function useState<S>(
  initial?: S | (() => S),
): [S | undefined, (updater: useState.StateUpdater<S>) => void] {
  return useReducerImpl(stateReducer, undefined, initial, stateInit, true);
}
