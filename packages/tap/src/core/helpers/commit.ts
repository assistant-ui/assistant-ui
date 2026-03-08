import { ResourceFiber, RenderResult } from "../types";

export function commitAllEffects(renderResult: RenderResult): void {
  const errors: unknown[] = [];

  for (const task of renderResult.effectTasks) {
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
      for (const error of errors) {
        console.error(error);
      }
      throw new AggregateError(errors, "Errors during commit");
    }
  }
}

export function cleanupAllEffects<R, P>(executionContext: ResourceFiber<R, P>) {
  const errors: unknown[] = [];
  for (const cell of executionContext.cells) {
    if (cell?.type === "effect") {
      cell.deps = null; // Reset deps so effect runs again on next mount

      if (cell.cleanup) {
        try {
          cell.cleanup?.();
        } catch (e) {
          errors.push(e);
        } finally {
          cell.cleanup = undefined;
        }
      }
    }
  }
  if (errors.length > 0) {
    if (errors.length === 1) {
      throw errors[0];
    } else {
      for (const error of errors) {
        console.error(error);
      }
      throw new AggregateError(errors, "Errors during cleanup");
    }
  }
}
