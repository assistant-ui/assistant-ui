import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { CommitPriority } from "../core/helpers/commit";
import { addCommit } from "../core/helpers/root";
import type { Cell } from "../core/types";
import { depsShallowEqual } from "../hooks/utils/depsShallowEqual";
import {
  throwHookOrderChanged,
  throwRenderedMoreHooks,
} from "./utils/hookErrors";

const newEffect = (): Cell & { type: "effect" } => ({
  type: "effect",
  cleanup: undefined,
  deps: null, // null means the effect has never been run
});

export namespace useEffect {
  export type Destructor = () => void;
  export type EffectCallback = () => Destructor | undefined;
}

export function useEffect(effect: useEffect.EffectCallback): void;
export function useEffect(
  effect: useEffect.EffectCallback,
  deps: readonly unknown[],
): void;
export function useEffect(
  effect: useEffect.EffectCallback,
  deps?: readonly unknown[],
): void {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;

  if (!fiber.isFirstRender && index >= fiber.cells.length) {
    throwRenderedMoreHooks();
  }

  let cell = fiber.cells[index];
  if (cell === undefined) {
    cell = newEffect();
    fiber.cells[index] = cell;
  }

  if (cell.type !== "effect") {
    throwHookOrderChanged();
  }

  if (deps && cell.deps && depsShallowEqual(cell.deps, deps)) return;
  if (cell.deps !== null && !!deps !== !!cell.deps)
    throw new Error(
      "useEffect called with and without dependencies across re-renders",
    );

  addCommit(fiber, CommitPriority.PassiveEffectCleanup, () => {
    try {
      cell.cleanup?.();
    } finally {
      cell.cleanup = undefined;
    }
  });
  addCommit(fiber, CommitPriority.PassiveEffectSetup, () => {
    try {
      const cleanup = effect();

      if (cleanup !== undefined && typeof cleanup !== "function") {
        throw new Error(
          "An effect function must either return a cleanup function or nothing. " +
            `Received: ${typeof cleanup}`,
        );
      }

      cell.cleanup = cleanup;
    } finally {
      cell.deps = deps;
    }
  });
}
