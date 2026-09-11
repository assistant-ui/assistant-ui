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
  const setup = cell.setup!;
  const deps = cell.setupDeps;
  const generation = cell.generation;
  let cleanup: (() => void) | undefined;
  try {
    const result = setup();
    if (result !== undefined && typeof result !== "function") {
      throw new Error(
        "An effect function must either return a cleanup function or nothing. " +
          `Received: ${typeof result}`,
      );
    }
    cleanup = result;
  } finally {
    if (cell.generation === generation) {
      cell.cleanup = cleanup;
      cell.deps = deps;
    } else {
      cleanup?.();
    }
  }
}

const effectNeedsRun = (cell: EffectCell): boolean => {
  if (cell.setup === undefined) return false;
  if (cell.deps === null) return true;
  if (cell.setupDeps === undefined) return true;
  return !depsShallowEqual(cell.deps!, cell.setupDeps);
};

export function reconcileEffects<R>(fiber: ResourceFiber<R>): void {
  const errors: unknown[] = [];
  const pending: EffectCell[] = [];

  for (const cell of fiber.effectCells) {
    if (effectNeedsRun(cell)) pending.push(cell);
  }

  for (const cell of pending) {
    cell.deps = null;
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
    cell.deps = null;

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
