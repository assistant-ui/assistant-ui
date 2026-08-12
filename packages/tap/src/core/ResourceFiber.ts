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

// Discards an uncommitted render, reverting the fiber to its committed state
// — the equivalent of React dropping a work-in-progress fiber. Only valid
// when the discarded render applied no state update (reducer rollback is the
// root's job, keyed to versions).
export function discardWipRender<R>(fiber: ResourceFiber<R>): void {
  fiber.wipCommitCallbacks = null;
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

  bubbleContextDeps(fiber);

  return value!;
}

export function commitResourceFiber<R>(fiber: ResourceFiber<R>): void {
  const commitCallbacks = fiber.wipCommitCallbacks;
  fiber.wipCommitCallbacks = null;
  // null means no render since the last commit (StrictMode replay, Activity
  // reveal): render-scoped state stays untouched.
  const rendered = commitCallbacks !== null;
  // Strict-mode connect (first mount or reconnect): setup, cleanup, then the
  // real setup, mirroring React's StrictMode replay on mount and reveal.
  const strictReplay =
    isDevelopment && !fiber.isMounted && fiber.devStrictMode === "root";

  fiber.isMounted = true;
  if (rendered) {
    fiber.contextDeps = fiber.wipContextDeps;
    commitRoot(fiber.root);

    if (fiber.memoCache.workInProgress !== null) {
      fiber.memoCache.current = fiber.memoCache.workInProgress;
      fiber.memoCache.workInProgress = null;
    }
  }

  fiber.isNeverMounted = false;

  if (commitCallbacks !== null) commitAllCallbacks(commitCallbacks);
  if (strictReplay) {
    reconcileEffects(fiber);
    cleanupAllEffects(fiber);
  }
  reconcileEffects(fiber);
}
