import { isDevelopment } from "../core/helpers/env";
import {
  getCurrentResourceFiber,
  peekResourceFiber,
} from "../core/helpers/execution-context";
import type { Cell, ChangelogRecord, ResourceFiber } from "../core/types";
import { applyChangelogRecord, markCellDirty } from "../core/helpers/root";

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

const createReducerCell = (
  fiber: ResourceFiber<any, any>,
  reducer: (state: any, action: any) => any,
  initialArg: any,
  initFn: ((arg: any) => any) | undefined,
  eagerDispatch: boolean,
): Cell & { type: "reducer" } => {
  const initialState = initFn ? initFn(initialArg) : initialArg;

  if (isDevelopment && fiber.devStrictMode && initFn) {
    void initFn(initialArg);
  }

  const cell: Cell & { type: "reducer" } = {
    type: "reducer",
    queue: null,
    renderQueue: null,
    workInProgress: initialState,
    current: initialState,
    reducer,
    dispatch: (action) => {
      const currentFiber = peekResourceFiber();
      if (currentFiber !== null) {
        if (currentFiber !== fiber)
          throw new Error(
            "Cannot update a resource while rendering a different resource.",
          );

        (fiber.renderPendingCells ??= new Set()).add(cell);
        (cell.renderQueue ??= []).push(action);
      } else {
        const record: ChangelogRecord = {
          fiber,
          cell,
          action,
          hasEagerState: false,
          eagerState: undefined,
          queued: false,
        };

        dispatchOnFiber(fiber, () => {
          if (
            eagerDispatch &&
            fiber.root.dirtyCells.size === 0 &&
            !record.hasEagerState
          ) {
            record.eagerState = reducer(cell.workInProgress, action);
            record.hasEagerState = true;

            if (Object.is(cell.current, record.eagerState)) return null;
          }

          return record;
        });
      }
    },
  };
  return cell;
};

function useReducerImpl<S, A, I, R extends S>(
  reducer: (state: S, action: A) => S,
  getDerivedState: ((state: S) => R) | undefined,
  initialArg: S | I,
  initFn: ((arg: I) => S) | undefined,
  eagerDispatch: boolean,
): [R, Dispatch<A>] {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;

  const existing = fiber.cells[index];
  let cell: Cell & { type: "reducer" };
  if (existing === undefined) {
    if (!fiber.isFirstRender && index >= fiber.cells.length) {
      throw new Error(
        "Rendered more hooks than during the previous render. " +
          "Hooks must be called in the exact same order in every render.",
      );
    }
    cell = createReducerCell(fiber, reducer, initialArg, initFn, eagerDispatch);
    fiber.cells[index] = cell;
  } else {
    if (existing.type !== "reducer") {
      throw new Error("Hook order changed between renders");
    }
    cell = existing;
  }

  const queue = cell.queue;
  if (queue !== null) {
    const sameReducer = reducer === cell.reducer;

    // The drain consumes entries: a re-render of the same uncommitted lineage
    // sees an empty queue and must not re-apply them. Rollback replays them
    // into the queue via the changelog.
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]!;
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

      item.queued = false;
      cell.workInProgress = item.eagerState;
    }
    cell.queue = null;
  }
  cell.reducer = reducer;

  if (cell.renderQueue !== null || getDerivedState !== undefined) {
    let derived = cell.workInProgress;
    if (cell.renderQueue !== null) {
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
        changed = !Object.is(result, derived);
        derived = result;
      } while (changed);
    }

    if (!Object.is(derived, cell.workInProgress)) {
      markCellDirty(fiber, cell);
      cell.workInProgress = derived;
    }
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
