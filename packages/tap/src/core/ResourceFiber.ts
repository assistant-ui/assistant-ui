import type { ResourceFiber, TapRoot } from "./types";
import { bubbleContextDeps } from "./context";
import { commitAllCallbacks, cleanupAllEffects } from "./helpers/commit";
import { withResourceFiber } from "./helpers/execution-context";
import { withReactDispatcher } from "./react-dispatcher";
import { isDevelopment } from "./helpers/env";
import { commitRoot } from "./helpers/root";

export function createResourceFiber<R, A extends readonly unknown[]>(
  hook: (...args: A) => R,
  root: TapRoot,
  markDirty: (() => void) | undefined = undefined,
  strictMode: "root" | "child" | null,
): ResourceFiber<R, A> {
  return {
    hook,
    root,
    markDirty,
    devStrictMode: strictMode,
    cells: [],
    contextDeps: null,
    wipContextDeps: null,
    commitCallbacks: null,
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

export function commitResourceFiber<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
): void {
  const commitCallbacks =
    fiber.wipCommitCallbacks ?? fiber.commitCallbacks ?? [];
  fiber.wipCommitCallbacks = null;
  fiber.commitCallbacks = commitCallbacks;

  fiber.isMounted = true;
  fiber.contextDeps = fiber.wipContextDeps;
  commitRoot(fiber.root);

  if (fiber.memoCache.workInProgress !== null) {
    fiber.memoCache.current = fiber.memoCache.workInProgress;
    fiber.memoCache.workInProgress = null;
  }

  if (isDevelopment && fiber.isNeverMounted && fiber.devStrictMode === "root") {
    fiber.isNeverMounted = false;

    commitAllCallbacks(commitCallbacks);
    cleanupAllEffects(fiber);
  }

  fiber.isNeverMounted = false;
  commitAllCallbacks(commitCallbacks);
}
