import { isDevelopment } from "../core/helpers/env";
import {
  getCurrentResourceFiber,
  peekResourceFiber,
} from "../core/helpers/execution-context";
import type {
  ChangelogRecord,
  ReducerQueueEntry,
  ResourceFiber,
} from "../core/types";
import { applyChangelogRecord, markCellDirty } from "../core/helpers/root";
import { useCell } from "../hooks/utils/useCell";

type Dispatch<A> = (action: A) => void;

const dispatchOnFiber = (
  fiber: ResourceFiber<any, any>,
  callback: () => ChangelogRecord | null,
): void => {
  if (fiber.isNeverMounted) {
    throw new Error("Resource updated before mount");
  }

  fiber.root.dispatchUpdate(() => {
    const record = callback();
    if (record) {
      applyChangelogRecord(record);
      fiber.root.changelog.push(record);
      return true;
    }
    return false;
  });
};

function useReducerImpl<S, A, I, R extends S>(
  reducer: (state: S, action: A) => S,
  getDerivedState: ((state: S) => R) | undefined,
  initialArg: S | I,
  initFn: ((arg: I) => S) | undefined,
  // React computes state eagerly at dispatch only for useState's basic state
  // reducer; user reducers run during render. Mirror that split so dev-mode
  // invocation counts and kept results match React.
  eagerDispatch: boolean,
): [R, Dispatch<A>] {
  const cell = useCell("reducer", () => {
    const fiber = getCurrentResourceFiber();

    // First render: compute initial state
    const initialState = initFn ? initFn(initialArg as I) : initialArg;

    if (isDevelopment && fiber.devStrictMode && initFn) {
      void initFn(initialArg as I);
    }

    return {
      type: "reducer",
      queue: new Set(),
      renderQueue: null,
      workInProgress: initialState,
      current: initialState,
      reducer,
      dispatch: (action: A) => {
        const currentFiber = peekResourceFiber();
        if (currentFiber !== null) {
          if (currentFiber !== fiber)
            throw new Error(
              "Cannot update a resource while rendering a different resource.",
            );

          (fiber.renderPendingCells ??= new Set()).add(cell);
          (cell.renderQueue ??= []).push(action);
        } else {
          const entry: ReducerQueueEntry = {
            action,
            hasEagerState: false,
            eagerState: undefined,
          };

          dispatchOnFiber(fiber, () => {
            if (
              eagerDispatch &&
              fiber.root.dirtyCells.size === 0 &&
              !entry.hasEagerState
            ) {
              entry.eagerState = reducer(cell.workInProgress, action);
              entry.hasEagerState = true;

              if (Object.is(cell.current, entry.eagerState)) return null;
            }

            return { fiber, cell, entry };
          });
        }
      },
    };
  });

  const fiber = getCurrentResourceFiber();
  const sameReducer = reducer === cell.reducer;
  cell.reducer = reducer;

  // The drain consumes entries: a re-render of the same uncommitted lineage
  // sees an empty queue and must not re-apply them. Rollback replays them
  // into the queue via the changelog.
  for (const item of cell.queue) {
    if (!item.hasEagerState || !sameReducer) {
      item.eagerState = reducer(cell.workInProgress, item.action);
      item.hasEagerState = true;

      if (isDevelopment && fiber.devStrictMode) {
        // React keeps the strict re-invocation's result for render-computed
        // actions (unlike eager-computed ones, whose ghost is discarded).
        item.eagerState = reducer(cell.workInProgress, item.action);
      }
    } else if (isDevelopment && fiber.devStrictMode) {
      void reducer(cell.workInProgress, item.action);
    }

    cell.workInProgress = item.eagerState;
  }
  cell.queue.clear();

  let derived = cell.workInProgress;
  if (cell.renderQueue?.length) {
    for (const action of cell.renderQueue) {
      derived = reducer(derived, action);
    }

    cell.renderQueue = null;
    fiber.renderPendingCells?.delete(cell);
  }

  if (getDerivedState) {
    let changed;
    let passes = 0;
    do {
      if (++passes > 25) {
        throw new Error(
          "Too many derivations. getDerivedState must reach a fixpoint; " +
            "tap limits the number of iterations to prevent an infinite loop.",
        );
      }
      const result = getDerivedState(derived);
      changed = result !== derived;
      derived = result;
    } while (changed);
  }

  if (!Object.is(derived, cell.workInProgress)) {
    markCellDirty(fiber, cell);
    cell.workInProgress = derived;
  }

  return [cell.workInProgress, cell.dispatch];
}

export function useReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
): [S, Dispatch<A>];
export function useReducer<S, A, I>(
  reducer: (state: S, action: A) => S,
  initialArg: I,
  init: (arg: I) => S,
): [S, Dispatch<A>];
export function useReducer<S, A, I>(
  reducer: (state: S, action: A) => S,
  initialArg: S | I,
  init?: (arg: I) => S,
): [S, Dispatch<A>] {
  return useReducerImpl(
    reducer,
    undefined,
    initialArg as S,
    init as ((arg: S) => S) | undefined,
    false,
  );
}

/** @internal useState's entry point: eager dispatch, like React's basic state reducer. */
export function useEagerReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
): [S, Dispatch<A>];
export function useEagerReducer<S, A, I>(
  reducer: (state: S, action: A) => S,
  initialArg: I,
  init: (arg: I) => S,
): [S, Dispatch<A>];
export function useEagerReducer<S, A, I>(
  reducer: (state: S, action: A) => S,
  initialArg: S | I,
  init?: (arg: I) => S,
): [S, Dispatch<A>] {
  return useReducerImpl(
    reducer,
    undefined,
    initialArg as S,
    init as ((arg: S) => S) | undefined,
    true,
  );
}

/**
 * @internal Backs useMemo and useMemoCache: a reducer cell whose state is
 * recomputed during render via getDerivedState. Not part of the public API;
 * user-facing state adjustment during render uses render-phase updates
 * (setState during render), like React.
 */
export function useReducerWithDerivedState<S, A, R extends S>(
  reducer: (state: S, action: A) => S,
  getDerivedState: (state: S) => R,
  initialState: S,
): [R, Dispatch<A>];
export function useReducerWithDerivedState<S, A, I, R extends S>(
  reducer: (state: S, action: A) => S,
  getDerivedState: (state: S) => R,
  initialArg: I,
  init: (arg: I) => S,
): [R, Dispatch<A>];
export function useReducerWithDerivedState<S, A, I, R extends S>(
  reducer: (state: S, action: A) => S,
  getDerivedState: (state: S) => R,
  initialArg: I,
  init?: (arg: I) => S,
): [R, Dispatch<A>] {
  return useReducerImpl(reducer, getDerivedState, initialArg, init, true);
}
