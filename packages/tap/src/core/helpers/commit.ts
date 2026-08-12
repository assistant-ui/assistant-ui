import type { CommitCallbacks, EffectCell, ResourceFiber } from "../types";
import { throwAggregated } from "./throwAggregated";
import { depsShallowEqual } from "../../hooks/utils/depsShallowEqual";

export function commitAllCallbacks(callbacks: CommitCallbacks): void {
  const errors: unknown[] = [];

  for (let i = 0; i < callbacks.length; i++) {
    try {
      callbacks[i]!();
    } catch (error) {
      errors.push(error);
    }
  }

  throwAggregated(errors, "Errors during commit");
}

function setupEffect(cell: EffectCell): void {
  try {
    const cleanup = cell.setup!();
    if (cleanup !== undefined && typeof cleanup !== "function") {
      throw new Error(
        "An effect function must either return a cleanup function or nothing. " +
          `Received: ${typeof cleanup}`,
      );
    }
    cell.cleanup = cleanup;
  } finally {
    cell.deps = cell.setupDeps;
  }
}

const effectNeedsRun = (cell: EffectCell, rendered: boolean): boolean => {
  if (cell.deps === null) return true;
  if (!rendered) return false;
  return (
    cell.deps === undefined ||
    cell.setupDeps === undefined ||
    !depsShallowEqual(cell.deps, cell.setupDeps)
  );
};

export function reconcileEffects<R>(
  fiber: ResourceFiber<R>,
  rendered: boolean,
): void {
  const errors: unknown[] = [];
  const pending: EffectCell[] = [];

  for (const cell of fiber.effectCells) {
    if (effectNeedsRun(cell, rendered)) pending.push(cell);
  }

  for (const cell of pending) {
    if (cell.cleanup === undefined) continue;
    try {
      cell.cleanup();
    } catch (e) {
      errors.push(e);
    } finally {
      cell.cleanup = undefined;
    }
  }
  for (const cell of pending) {
    try {
      setupEffect(cell);
    } catch (e) {
      errors.push(e);
    }
  }

  throwAggregated(errors, "Errors during commit");
}

export function cleanupAllEffects<R>(executionContext: ResourceFiber<R>) {
  const errors: unknown[] = [];
  for (const cell of executionContext.effectCells) {
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
  throwAggregated(errors, "Errors during cleanup");
}
