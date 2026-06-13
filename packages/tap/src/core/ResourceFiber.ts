import type { ResourceFiber, RenderResult, ResourceFiberRoot } from "./types";
import {
  commitAllCallbacks,
  createCommitCallbacks,
  cleanupAllEffects,
} from "./helpers/commit";
import { withResourceFiber } from "./helpers/execution-context";
import { withReactDispatcher } from "./react-dispatcher";
import { isDevelopment } from "./helpers/env";
import { commitRoot } from "./helpers/root";

export function createResourceFiber<R, A extends readonly unknown[]>(
  hook: (...args: A) => R,
  root: ResourceFiberRoot,
  markDirty: (() => void) | undefined = undefined,
  strictMode: "root" | "child" | null,
): ResourceFiber<R, A> {
  return {
    hook,
    root,
    markDirty,
    devStrictMode: strictMode,
    cells: [],
    memoCache: {
      current: null,
      workInProgress: null,
      index: 0,
    },
    commitCallbacks: createCommitCallbacks(),
    renderPendingCells: null,
    currentIndex: 0,
    renderContext: undefined,
    isFirstRender: true,
    isMounted: false,
    isNeverMounted: true,
  };
}

export function unmountResourceFiber<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
): void {
  if (!fiber.isMounted)
    throw new Error("Tried to unmount a fiber that is already unmounted");

  fiber.isMounted = false;
  cleanupAllEffects(fiber);
}

export function renderResourceFiber<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
  args: Readonly<A>,
): RenderResult {
  fiber.memoCache.workInProgress = null;

  // Discard render-phase actions left by a previous render
  if (fiber.renderPendingCells !== null) {
    for (const cell of fiber.renderPendingCells) cell.renderQueue = null;
    fiber.renderPendingCells.clear();
  }

  let passes = 0;
  let result: RenderResult;
  do {
    if (++passes > 25) {
      throw new Error(
        "Too many re-renders. tap limits the number of renders to prevent " +
          "an infinite loop.",
      );
    }

    result = {
      commitCallbacks: createCommitCallbacks(),
      value: undefined as R | undefined,
    };
    fiber.memoCache.index = 0;

    withResourceFiber(fiber, () => {
      fiber.renderContext = result;
      try {
        result.value = withReactDispatcher(() => fiber.hook(...args));
      } finally {
        fiber.renderContext = undefined;
      }
    });
  } while ((fiber.renderPendingCells?.size ?? 0) > 0);

  return result;
}

export function commitResourceFiber<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
  result: RenderResult,
): void {
  fiber.isMounted = true;
  commitRoot(fiber.root);

  const fiberCommitCallbacks = fiber.commitCallbacks;
  fiber.commitCallbacks = createCommitCallbacks();

  if (fiber.memoCache.workInProgress !== null) {
    fiber.memoCache.current = fiber.memoCache.workInProgress;
    fiber.memoCache.workInProgress = null;
  }

  if (isDevelopment && fiber.isNeverMounted && fiber.devStrictMode === "root") {
    fiber.isNeverMounted = false;

    commitAllCallbacks(fiberCommitCallbacks, result.commitCallbacks);
    cleanupAllEffects(fiber);
  }

  fiber.isNeverMounted = false;
  commitAllCallbacks(fiberCommitCallbacks, result.commitCallbacks);
}
