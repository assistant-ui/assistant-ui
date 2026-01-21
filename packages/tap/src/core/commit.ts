import { ResourceFiber, RenderResult } from "./types";
import { tapInstrumentation } from "./debug";

export function commitRender<R, P>(
  renderResult: RenderResult,
  fiber: ResourceFiber<R, P>,
): void {
  tapInstrumentation?.onCommitStart?.(fiber);
  // Process all tasks collected during render
  renderResult.commitTasks.forEach((task) => {
    const cellIndex = task.cellIndex;
    const effectCell = fiber.cells[cellIndex]!;
    if (effectCell.type !== "effect") {
      throw new Error("Cannot find effect cell");
    }

    // Check if deps changed
    let shouldRunEffect = true;

    if (effectCell.deps !== undefined && task.deps !== undefined) {
      shouldRunEffect =
        effectCell.deps.length !== task.deps.length ||
        effectCell.deps.some((dep, j) => !Object.is(dep, task.deps![j]));
    }

    // Run cleanup if effect will re-run
    if (shouldRunEffect) {
      if (effectCell.mounted) {
        if (typeof effectCell.deps !== typeof task.deps) {
          throw new Error(
            "tapEffect called with and without dependencies across re-renders",
          );
        }

        try {
          if (effectCell.mounted && effectCell.cleanup) {
            tapInstrumentation?.onEffectCleanupStart?.(fiber, cellIndex);
            try {
              effectCell.cleanup();
            } finally {
              tapInstrumentation?.onEffectCleanupEnd?.(fiber, cellIndex);
            }
          }
        } finally {
          effectCell.mounted = false;
        }
      }
      tapInstrumentation?.onEffectRunStart?.(fiber, cellIndex);
      let cleanup;
      try {
        cleanup = task.effect();
      } finally {
        tapInstrumentation?.onEffectRunEnd?.(fiber, cellIndex);
      }

      if (cleanup !== undefined && typeof cleanup !== "function") {
        throw new Error(
          "An effect function must either return a cleanup function or nothing. " +
            `Received: ${typeof cleanup}`,
        );
      }

      effectCell.mounted = true;
      effectCell.cleanup = typeof cleanup === "function" ? cleanup : undefined;
      effectCell.deps = task.deps;
    } else {
      tapInstrumentation?.onEffectSkipped?.(fiber, cellIndex);
    }
  });
  tapInstrumentation?.onCommitEnd?.(fiber);
}

export function cleanupAllEffects<R, P>(executionContext: ResourceFiber<R, P>) {
  let firstError: unknown | null = null;
  // Run cleanups in reverse order
  for (let i = executionContext.cells.length - 1; i >= 0; i--) {
    const cell = executionContext.cells[i];
    if (cell?.type === "effect" && cell.mounted && cell.cleanup) {
      tapInstrumentation?.onEffectCleanupStart?.(executionContext, i);
      try {
        cell.cleanup();
      } catch (e) {
        if (firstError == null) firstError = e;
      } finally {
        tapInstrumentation?.onEffectCleanupEnd?.(executionContext, i);
        cell.mounted = false;
      }
    }
  }
  if (firstError != null) throw firstError;
}
