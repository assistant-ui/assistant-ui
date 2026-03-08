import { isDevelopment } from "../core/helpers/env";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { ReducerQueueEntry, ResourceFiber } from "../core/types";
import { markCellDirty } from "../core/helpers/root";
import { tapHook } from "./utils/tapHook";

type Dispatch<A> = (action: A) => void;

const dispatchOnFiber = (
  fiber: ResourceFiber<any, any>,
  callback: () => (() => void) | null,
): void => {
  if (fiber.renderContext) {
    throw new Error("Resource updated during render");
  }
  if (fiber.isNeverMounted) {
    throw new Error("Resource updated before mount");
  }

  fiber.root.dispatchUpdate(() => {
    const result = callback();
    if (result) {
      result();
      fiber.root.changelog.push(result);
      return true;
    }
    return false;
  });
};

function tapReducerImpl<S, A, I, R extends S>(
  reducer: (state: S, action: A) => S,
  getDerivedState: ((state: S) => R) | undefined,
  initialArg: S | I,
  initFn: ((arg: I) => S) | undefined,
): [R, Dispatch<A>] {
  const cell = tapHook("reducer", () => {
    const fiber = getCurrentResourceFiber();

    // First render: compute initial state
    const initialState = initFn ? initFn(initialArg as I) : initialArg;

    if (isDevelopment && fiber.devStrictMode && initFn) {
      void initFn(initialArg as I);
    }

    return {
      type: "reducer",
      queue: new Set(),
      dirty: false,
      workInProgress: initialState,
      current: initialState,
      reducer,
      dispatch: (action: A) => {
        const entry: ReducerQueueEntry = {
          action,
          hasEagerState: false,
          eagerState: undefined,
        };

        dispatchOnFiber(fiber, () => {
          if (fiber.root.dirtyCells.length === 0 && !entry.hasEagerState) {
            entry.eagerState = reducer(cell.workInProgress, action);
            entry.hasEagerState = true;

            if (Object.is(cell.current, entry.eagerState)) return null;
          }

          return () => {
            markCellDirty(fiber, cell);
            cell.queue.add(entry);
          };
        });
      },
    };
  });

  const fiber = getCurrentResourceFiber();
  const sameReducer = reducer === cell.reducer;
  cell.reducer = reducer;

  for (const item of cell.queue) {
    if (!item.hasEagerState || !sameReducer) {
      item.eagerState = reducer(cell.workInProgress, item.action);
      item.hasEagerState = true;
    }

    if (isDevelopment && fiber.devStrictMode) {
      void reducer(cell.workInProgress, item.action);
    }

    cell.workInProgress = item.eagerState;
  }
  cell.queue.clear();

  if (getDerivedState) {
    const derived = getDerivedState(cell.workInProgress);

    if (!Object.is(derived, cell.workInProgress)) {
      markCellDirty(fiber, cell);
      cell.workInProgress = derived;
    }
  }

  return [cell.workInProgress, cell.dispatch];
}

export function tapReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
): [S, Dispatch<A>];
export function tapReducer<S, A, I>(
  reducer: (state: S, action: A) => S,
  initialArg: I,
  init: (arg: I) => S,
): [S, Dispatch<A>];
export function tapReducer<S, A, I>(
  reducer: (state: S, action: A) => S,
  initialArg: S | I,
  init?: (arg: I) => S,
): [S, Dispatch<A>] {
  return tapReducerImpl(
    reducer,
    undefined,
    initialArg as S,
    init as ((arg: S) => S) | undefined,
  );
}

export function tapReducerWithDerivedState<S, A, R extends S>(
  reducer: (state: S, action: A) => S,
  getDerivedState: (state: S) => R,
  initialState: S,
): [R, Dispatch<A>];
export function tapReducerWithDerivedState<S, A, I, R extends S>(
  reducer: (state: S, action: A) => S,
  getDerivedState: (state: S) => R,
  initialArg: I,
  init: (arg: I) => S,
): [R, Dispatch<A>];
export function tapReducerWithDerivedState<S, A, I, R extends S>(
  reducer: (state: S, action: A) => S,
  getDerivedState: (state: S) => R,
  initialArg: I,
  init?: (arg: I) => S,
): [R, Dispatch<A>] {
  return tapReducerImpl(reducer, getDerivedState, initialArg, init);
}
