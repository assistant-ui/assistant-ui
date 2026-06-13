import { isDevelopment } from "../core/helpers/env";
import {
  getCurrentResourceFiber,
  peekResourceFiber,
} from "../core/helpers/execution-context";
import type { Cell, ChangelogRecord, ResourceFiber } from "../core/types";
import {
  addCommit,
  applyChangelogRecord,
  markReducerDirty,
} from "../core/helpers/root";
import { CommitPriority } from "../core/helpers/commit";
import {
  throwHookOrderChanged,
  throwRenderedMoreHooks,
} from "./utils/hookErrors";

type Dispatch<A> = (action: A) => void;

const dispatchOnFiber = (
  fiber: ResourceFiber<any, any>,
  record: ChangelogRecord,
  eagerReducer: ((state: any, action: any) => any) | undefined,
): void => {
  if (fiber.isNeverMounted) {
    throw new Error("Resource updated before mount");
  }

  let evaluated = false;
  let hasWork = true;

  fiber.root.dispatchUpdate(
    () => {
      if (evaluated) return hasWork;
      evaluated = true;

      if (
        eagerReducer &&
        fiber.root.changelog.length === 0 &&
        !record.cell.isDirty &&
        !record.hasEagerState
      ) {
        record.eagerState = eagerReducer(
          record.cell.workInProgress,
          record.action,
        );
        record.hasEagerState = true;

        hasWork = !Object.is(record.cell.current, record.eagerState);
      }

      return hasWork;
    },
    () => {
      evaluated = true;
      hasWork = true;
      applyChangelogRecord(record);
      fiber.root.changelog.push(record);
      return true;
    },
  );
};

const createReducerCell = (
  fiber: ResourceFiber<any, any>,
  reducer: (state: any, action: any) => any,
  initialArg: any,
  initFn: ((arg: any) => any) | undefined,
  eagerBailout: boolean,
): Cell & { type: "reducer" } => {
  const initialState = initFn ? initFn(initialArg) : initialArg;

  if (isDevelopment && fiber.devStrictMode && initFn) {
    void initFn(initialArg);
  }

  const cell: Cell & { type: "reducer" } = {
    type: "reducer",
    workInProgress: initialState,
    current: initialState,
    isDirty: false,
    queue: null,
    renderQueue: null,
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

        dispatchOnFiber(fiber, record, eagerBailout ? reducer : undefined);
      }
    },
  };
  return cell;
};

export function useReducerImpl<S, A, I>(
  reducer: (state: S, action: A) => S,
  initialArg: S | I,
  initFn: ((arg: I) => S) | undefined,
  eagerBailout: boolean,
): [S, Dispatch<A>] {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;

  const existing = fiber.cells[index];
  const cell: Cell & { type: "reducer" } = (() => {
    if (existing !== undefined) {
      return existing.type === "reducer" ? existing : throwHookOrderChanged();
    }

    if (!fiber.isFirstRender && index >= fiber.cells.length) {
      throwRenderedMoreHooks();
    }

    const cell = createReducerCell(
      fiber,
      reducer,
      initialArg,
      initFn,
      eagerBailout,
    );
    fiber.cells[index] = cell;
    return cell;
  })();

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

  if (cell.renderQueue !== null) {
    let derived = cell.workInProgress;
    for (const action of cell.renderQueue) {
      derived = reducer(derived, action);
    }

    cell.renderQueue = null;
    fiber.renderPendingCells?.delete(cell);

    if (!Object.is(derived, cell.workInProgress)) {
      markReducerDirty(fiber, cell);
      cell.workInProgress = derived;
    }
  }

  if (cell.isDirty) {
    addCommit(fiber, CommitPriority.HookState, () => {
      cell.current = cell.workInProgress;
      cell.isDirty = false;
    });
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
    initialArg as S,
    init as ((arg: S) => S) | undefined,
    false,
  );
}
