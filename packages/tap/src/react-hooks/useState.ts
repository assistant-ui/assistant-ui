import { useReducerImpl } from "./useReducer";

export namespace useState {
  export type StateUpdater<S> = S | ((prev: S) => S);
}

const stateReducer = <S>(
  state: S | undefined,
  action: useState.StateUpdater<S>,
): S | undefined =>
  typeof action === "function"
    ? (action as (prev: S | undefined) => S)(state)
    : action;

const stateInit = <S>(initial: S | (() => S) | undefined): S | undefined =>
  initial === undefined
    ? undefined
    : typeof initial === "function"
      ? (initial as () => S)()
      : initial;

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
  return useReducerImpl<
    S | undefined,
    useState.StateUpdater<S>,
    S | (() => S) | undefined
  >(stateReducer, initial, stateInit, true);
}
