import type { CommitCallbacks, EffectCell, ResourceFiber } from "../types";
import { throwAggregated } from "./throwAggregated";

export const CommitPriority = {
  HookState: 0,
  EffectEvent: 1,
  PassiveEffectCleanup: 2,
  PassiveEffectSetup: 3,
} as const;
export type CommitPriority =
  (typeof CommitPriority)[keyof typeof CommitPriority];

const COMMIT_PRIORITIES = [
  CommitPriority.HookState,
  CommitPriority.EffectEvent,
  CommitPriority.PassiveEffectCleanup,
  CommitPriority.PassiveEffectSetup,
] as const;

export const createCommitCallbacks = (): CommitCallbacks => [];

export function commitAllCallbacks(callbacks: CommitCallbacks): void {
  const errors: unknown[] = [];

  for (const priority of COMMIT_PRIORITIES) {
    const lane = callbacks[priority];
    if (lane === undefined) continue;

    for (let i = 0; i < lane.length; i++) {
      try {
        lane[i]!();
      } catch (error) {
        errors.push(error);
      }
    }
  }

  throwAggregated(errors, "Errors during commit");
}

export function setupEffect(cell: EffectCell): void {
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

export function reconnectAllEffects<R>(fiber: ResourceFiber<R>): void {
  const errors: unknown[] = [];
  for (const cell of fiber.cells) {
    if (cell?.type !== "effect" || cell.deps !== null) continue;

    try {
      setupEffect(cell);
    } catch (e) {
      errors.push(e);
    }
  }
  throwAggregated(errors, "Errors during reconnect");
}

export function cleanupAllEffects<R>(executionContext: ResourceFiber<R>) {
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
  throwAggregated(errors, "Errors during cleanup");
}
