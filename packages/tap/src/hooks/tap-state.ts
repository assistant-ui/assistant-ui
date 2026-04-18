import { tapReducer } from "./tap-reducer";

export namespace tapState {
  export type StateUpdater<S> = S | ((prev: S) => S);
}

const stateReducer = <S>(
  state: S | undefined,
  action: tapState.StateUpdater<S>,
): S =>
  typeof action === "function"
    ? (action as (prev: S | undefined) => S)(state)
    : action;

const stateInit = <S>(initial: S | (() => S)): S =>
  typeof initial === "function" ? (initial as () => S)() : initial;

export function tapState<S = undefined>(): [
  S | undefined,
  (updater: tapState.StateUpdater<S>) => void,
];
export function tapState<S>(
  initial: S | (() => S),
): [S, (updater: tapState.StateUpdater<S>) => void];
export function tapState<S>(
  initial?: S | (() => S),
): [S | undefined, (updater: tapState.StateUpdater<S>) => void] {
  return tapReducer(stateReducer, initial, stateInit);
}
