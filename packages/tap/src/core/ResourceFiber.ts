import type { ResourceFiber, TapRoot } from "./types";
import { bubbleContextDeps } from "./context";
import {
  commitAllCallbacks,
  cleanupCells,
  reconcileEffects,
} from "./helpers/commit";
import {
  peekResourceFiber,
  withResourceFiber,
} from "./helpers/execution-context";
import { withReactDispatcher } from "./react-dispatcher";
import { isDevelopment } from "./helpers/env";
import { commitRoot } from "./helpers/root";
import { throwAggregated } from "./helpers/throwAggregated";

export function createResourceFiber<R>(
  hook: (...args: any[]) => R,
  root: TapRoot,
  markDirty: (() => void) | undefined = undefined,
  strictMode: "root" | "child" | null,
): ResourceFiber<R> {
  return {
    hook,
    root,
    markDirty,
    devStrictMode: strictMode,
    cells: [],
    effectCells: [],
    insertionCells: null,
    hostCells: null,
    contextDeps: null,
    wipContextDeps: null,
    wipCommitCallbacks: null,
    memoCache: {
      current: null,
      workInProgress: null,
      index: 0,
    },
    renderPendingCells: null,
    currentIndex: 0,
    isRefreshing: false,
    isFirstRender: true,
    isMounted: false,
    isReleased: false,
    isNeverMounted: true,
  };
}

// Applied state survives in cells: bailout callers must have none, abort
// callers re-render before the next value-bearing commit
export function discardWipRender<R>(fiber: ResourceFiber<R>): void {
  fiber.wipCommitCallbacks = null;
  fiber.wipContextDeps = null;
  fiber.memoCache.workInProgress = null;
}

function cleanupResourceFiber<R>(
  fiber: ResourceFiber<R>,
  insertion: boolean,
  errors: unknown[] | undefined,
): unknown[] | undefined {
  try {
    if (insertion) {
      fiber.isReleased = true;
      if (fiber.insertionCells !== null) cleanupCells(fiber.insertionCells);
    } else if (fiber.isMounted) {
      fiber.isMounted = false;
      cleanupCells(fiber.effectCells);
    }
  } catch (error) {
    (errors ??= []).push(error);
  }
  if (fiber.hostCells !== null) {
    for (const cell of fiber.hostCells) {
      if (cell.fiber !== null) {
        errors = cleanupResourceFiber(cell.fiber, insertion, errors);
      }
      if (cell.fibers !== null) {
        for (const { fiber } of cell.fibers.values()) {
          errors = cleanupResourceFiber(fiber, insertion, errors);
        }
      }
    }
  }
  return errors;
}

export function unmountResourceFiber<R>(
  fiber: ResourceFiber<R>,
  permanent = true,
): void {
  let errors: unknown[] | undefined;
  if (permanent) errors = cleanupResourceFiber(fiber, true, errors);
  errors = cleanupResourceFiber(fiber, false, errors);
  if (errors !== undefined) throwAggregated(errors, "Errors during cleanup");
}

export function unmountResourceFibers(
  fibers: readonly ResourceFiber<unknown>[],
): void {
  let errors: unknown[] | undefined;
  for (const fiber of fibers) {
    if (fiber.isReleased) errors = cleanupResourceFiber(fiber, true, errors);
  }
  for (const fiber of fibers) {
    errors = cleanupResourceFiber(fiber, false, errors);
  }
  if (errors !== undefined) throwAggregated(errors, "Errors during cleanup");
}

export function renderResourceFiber<R>(
  fiber: ResourceFiber<R>,
  args: readonly unknown[],
): R {
  // Discard render-phase actions left by a previous render
  if (fiber.renderPendingCells !== null) {
    for (const cell of fiber.renderPendingCells) cell.renderQueue = null;
    fiber.renderPendingCells.clear();
  }

  let passes = 0;
  let value: R;
  const wasRefreshing = fiber.isRefreshing;
  fiber.isRefreshing =
    wasRefreshing || (peekResourceFiber()?.isRefreshing ?? false);
  try {
    do {
      if (++passes > 25) {
        throw new Error(
          "Too many re-renders. tap limits the number of renders to prevent " +
            "an infinite loop.",
        );
      }
      fiber.memoCache.index = 0;

      withResourceFiber(fiber, () => {
        value = withReactDispatcher(() => fiber.hook(...args));
      });
    } while ((fiber.renderPendingCells?.size ?? 0) > 0);
  } catch (error) {
    discardWipRender(fiber);
    throw error;
  } finally {
    fiber.isRefreshing = wasRefreshing;
  }

  bubbleContextDeps(fiber);

  return value!;
}

export function commitResourceFiber<R>(fiber: ResourceFiber<R>): void {
  const commitCallbacks = fiber.wipCommitCallbacks;
  fiber.wipCommitCallbacks = null;
  const strictReplay =
    isDevelopment && !fiber.isMounted && fiber.devStrictMode === "root";

  fiber.isMounted = true;
  fiber.isNeverMounted = false;

  if (commitCallbacks !== null) {
    fiber.contextDeps = fiber.wipContextDeps;
    commitRoot(fiber.root);

    if (fiber.memoCache.workInProgress !== null) {
      fiber.memoCache.current = fiber.memoCache.workInProgress;
      fiber.memoCache.workInProgress = null;
    }

    commitAllCallbacks(commitCallbacks);
  }
  if (strictReplay) {
    reconcileEffects(fiber, commitCallbacks !== null);
    unmountResourceFiber(fiber, false);
    fiber.isMounted = true;
  }
  reconcileEffects(fiber, !strictReplay && commitCallbacks !== null);
}
