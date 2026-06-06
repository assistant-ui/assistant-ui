import type { Cell } from "../core/types";
import { depsShallowEqual } from "./utils/depsShallowEqual";
import { useCell, registerRenderMountTask } from "./utils/useCell";

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

  registerRenderMountTask(() => {
    const errors: unknown[] = [];

    try {
      cell.cleanup?.();
    } catch (error) {
      errors.push(error);
    } finally {
      cell.cleanup = undefined;
    }

    try {
      const cleanup = effect();

      if (cleanup !== undefined && typeof cleanup !== "function") {
        throw new Error(
          "An effect function must either return a cleanup function or nothing. " +
            `Received: ${typeof cleanup}`,
        );
      }

      cell.cleanup = cleanup;
    } catch (error) {
      errors.push(error);
    }

    cell.deps = deps;

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
  });
}
