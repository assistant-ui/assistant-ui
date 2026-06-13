import type { CommitCallbacks, ResourceFiber } from "../types";

export enum CommitPriority {
  HookState = 0,
  EffectEvent = 1,
  PassiveEffectCleanup = 2,
  PassiveEffectSetup = 3,
}

const COMMIT_PRIORITIES = [
  CommitPriority.HookState,
  CommitPriority.EffectEvent,
  CommitPriority.PassiveEffectCleanup,
  CommitPriority.PassiveEffectSetup,
] as const;

export const createCommitCallbacks = (): CommitCallbacks => [];

export function commitAllCallbacks(
  ...callbackLists: readonly CommitCallbacks[]
): void {
  const errors: unknown[] = [];

  for (const priority of COMMIT_PRIORITIES) {
    for (const callbacks of callbackLists) {
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

export function cleanupAllEffects<R, A extends readonly unknown[]>(
  executionContext: ResourceFiber<R, A>,
) {
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
