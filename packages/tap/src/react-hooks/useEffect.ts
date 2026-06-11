import type { Cell } from "../core/types";
import { depsShallowEqual } from "../hooks/utils/depsShallowEqual";
import { useCell, registerRenderMountTask } from "../hooks/utils/useCell";

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
  const cell = useCell("effect", newEffect);

  if (deps && cell.deps && depsShallowEqual(cell.deps, deps)) return;
  if (cell.deps !== null && !!deps !== !!cell.deps)
    throw new Error(
      "useEffect called with and without dependencies across re-renders",
    );

  registerRenderMountTask({
    cleanup: () => {
      try {
        cell.cleanup?.();
      } finally {
        cell.cleanup = undefined;
      }
    },
    setup: () => {
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
    },
  });
}
