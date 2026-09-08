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
import { throwAggregated } from "./helpers/throwAggregated";

const parentDisposalLinks = new WeakMap<
  ResourceFiber<unknown>,
  {
    parent: ResourceFiber<unknown>;
    dispose: () => void;
    unlink: () => void;
  }
>();

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
    disposeCallbacks: new Set(),
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
    isDisposePending: false,
    isDisposing: false,
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

export function disposeResourceFiber<R>(fiber: ResourceFiber<R>): void {
  if (fiber.isDisposing) return;
  fiber.isDisposePending = false;
  fiber.isDisposing = true;

  const errors: unknown[] = [];
  try {
    unmountResourceFiber(fiber);
  } catch (error) {
    errors.push(error);
  }

  const callbacks = [...fiber.disposeCallbacks];
  fiber.disposeCallbacks.clear();
  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      errors.push(error);
    }
  }

  throwAggregated(errors, "Errors during resource disposal");
}

export function markResourceFiberForDisposal<R>(fiber: ResourceFiber<R>): void {
  if (!fiber.isDisposing) fiber.isDisposePending = true;
}

export function scheduleResourceFiberDisposal<R>(
  fiber: ResourceFiber<R>,
): void {
  markResourceFiberForDisposal(fiber);
  if (!fiber.isMounted) {
    // A hidden React subtree has already consumed its passive cleanup.
    queueMicrotask(() => disposeResourceFiber(fiber));
  }
}

export function attachResourceFiberToParent<R>(
  fiber: ResourceFiber<R>,
  parent: ResourceFiber<unknown>,
): void {
  const existing = parentDisposalLinks.get(fiber);
  if (existing?.parent === parent) return;
  if (existing !== undefined) {
    existing.parent.disposeCallbacks.delete(existing.dispose);
    fiber.disposeCallbacks.delete(existing.unlink);
  }

  const dispose = () => disposeResourceFiber(fiber);
  const unlink = () => {
    parent.disposeCallbacks.delete(dispose);
    parentDisposalLinks.delete(fiber);
  };
  parent.disposeCallbacks.add(dispose);
  fiber.disposeCallbacks.add(unlink);
  parentDisposalLinks.set(fiber, { parent, dispose, unlink });
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
  if (fiber.isDisposing) return;
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
