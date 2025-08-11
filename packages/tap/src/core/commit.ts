import { ResourceFiber, RenderResult } from "./types";

export function commitRender(
  renderContext: RenderResult,
  executionContext: ResourceFiber
): void {
  // Process all tasks collected during render
  renderContext.commitTasks.forEach((task) => {
    const cellIndex = task.cellIndex;
    const effectCell = executionContext.cells[cellIndex]!;
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
            "tapEffect called with and without dependencies across re-renders"
          );
        }

        try {
          if (effectCell.cleanup) {
            effectCell.cleanup();
          }
        } finally {
          effectCell.mounted = false;
        }
      }

      try {
        const cleanup = task.effect();

        if (cleanup !== undefined && typeof cleanup !== "function") {
          throw new Error(
            "An effect function must either return a cleanup function or nothing. " +
              `Received: ${typeof cleanup}`
          );
        }

        effectCell.mounted = true;
        effectCell.cleanup =
          typeof cleanup === "function" ? cleanup : undefined;
        effectCell.deps = task.deps;
      } catch (error) {
        throw error;
      }
    }
  });
}

export function cleanupAllEffects(executionContext: ResourceFiber) {
  // Run cleanups in reverse order
  for (let i = executionContext.cells.length - 1; i >= 0; i--) {
    const cell = executionContext.cells[i];
    if (cell?.type === "effect" && cell.cleanup) {
      try {
        cell.cleanup();
      } finally {
        cell.mounted = false;
      }
    }
  }
}
