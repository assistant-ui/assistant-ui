import type { ResourceFiber, TapRoot } from "./types";
import { bubbleContextDeps } from "./context";
import {
  commitAllCallbacks,
  cleanupAllEffects,
  reconcileEffects,
} from "./helpers/commit";
import { withResourceFiber } from "./helpers/execution-context";
import { withReactDispatcher } from "./react-dispatcher";
import { isDevelopment } from "./helpers/env";
import { commitRoot } from "./helpers/root";

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
    isFirstRender: true,
    isMounted: false,
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

export function unmountResourceFiber<R>(fiber: ResourceFiber<R>): void {
  if (!fiber.isMounted) return;

  fiber.isMounted = false;
  cleanupAllEffects(fiber);
}

export function renderResourceFiber<R>(
  fiber: ResourceFiber<R>,
  args: readonly unknown[],
): R {
  fiber.memoCache.workInProgress = null;

  // Discard render-phase actions left by a previous render
  if (fiber.renderPendingCells !== null) {
    for (const cell of fiber.renderPendingCells) cell.renderQueue = null;
    fiber.renderPendingCells.clear();
  }

  let passes = 0;
  let value: R;
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
    reconcileEffects(fiber);
    cleanupAllEffects(fiber);
  }
  reconcileEffects(fiber);
}
