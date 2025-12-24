import { ResourceFiber, RenderResult } from "./types";

export function commitRender(renderResult: RenderResult): void {
  const errors: unknown[] = [];

  for (const task of renderResult.commitTasks) {
    try {
      task();
    } catch (error) {
      errors.push(error);
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
    if (cell?.type === "effect" && cell.cleanup) {
      try {
        cell.cleanup?.();
      } catch (e) {
        errors.push(e);
      } finally {
        cell.cleanup = undefined;
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
