import { ResourceFiber, RenderResult } from "./types";

export function commitRender<R, P>(
  renderResult: RenderResult,
  fiber: ResourceFiber<R, P>,
): void {
  const errors: unknown[] = [];
  // Process all tasks collected during render
  for (const task of renderResult.commitTasks) {
    const cellIndex = task.cellIndex;
    const effectCell = fiber.cells[cellIndex]!;

    // this should never happen, just in case
    if (effectCell.type !== "effect")
      throw new Error("Cannot find effect cell");

    // Check if deps changed

    if (
      effectCell.mounted &&
      effectCell.deps !== undefined &&
      task.deps !== undefined
    ) {
      const shouldRunEffect =
        effectCell.deps.length !== task.deps.length ||
        effectCell.deps.some((dep, j) => !Object.is(dep, task.deps![j]));
      if (!shouldRunEffect) continue;
    }

    if (effectCell.mounted) {
      if (typeof effectCell.deps !== typeof task.deps) {
        errors.push(
          "tapEffect called with and without dependencies across re-renders",
        );
      }

      // Run cleanup if effect will re-run
      try {
        if (effectCell.mounted && effectCell.cleanup) {
          effectCell.cleanup();
        }
      } catch (ex) {
        errors.push(ex);
      } finally {
        effectCell.mounted = false;
      }
    }

    try {
      const cleanup = task.effect();

      if (cleanup !== undefined && typeof cleanup !== "function") {
        throw new Error(
          "An effect function must either return a cleanup function or nothing. " +
            `Received: ${typeof cleanup}`,
        );
      }

      effectCell.cleanup = cleanup;
    } catch (ex) {
      errors.push(ex);
    } finally {
      effectCell.mounted = true;
      effectCell.deps = task.deps;
    }
  }

  if (errors.length > 0) {
    if (errors.length === 1) {
      throw errors[0];
    } else {
      throw new AggregateError(errors, "Errors during commit");
    }
  }
}

export function cleanupAllEffects<R, P>(executionContext: ResourceFiber<R, P>) {
  const errors: unknown[] = [];
  for (const cell of executionContext.cells) {
    if (cell?.type === "effect" && cell.mounted) {
      try {
        cell.cleanup?.();
      } catch (e) {
        errors.push(e);
      } finally {
        cell.mounted = false;
      }
    }
  }
  if (errors.length > 0) {
    if (errors.length === 1) {
      throw errors[0];
    } else {
      throw new AggregateError(errors, "Errors during cleanup");
    }
  }
}
