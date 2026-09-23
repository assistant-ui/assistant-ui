import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { addCommit } from "../core/helpers/root";
import type { EffectCell } from "../core/types";
import {
  throwHookOrderChanged,
  throwRenderedMoreHooks,
} from "./utils/hookErrors";

const newEffect = (kind: EffectCell["kind"]): EffectCell => ({
  type: "effect",
  kind,
  setup: undefined,
  setupDeps: undefined,
  cleanup: undefined,
  deps: null, // null means the effect has never been run
  generation: 0,
});

export namespace useEffect {
  export type Destructor = () => void;
  export type EffectCallback = () => Destructor | undefined;
}

export function useEffectImpl(
  effect: useEffect.EffectCallback,
  deps?: readonly unknown[],
  kind: EffectCell["kind"] = "effect",
): void {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;

  const existing = fiber.cells[index];
  const cell: EffectCell =
    existing === undefined
      ? newEffect(kind)
      : existing.type === "effect" && existing.kind === kind
        ? existing
        : throwHookOrderChanged();

  if (existing === undefined) {
    if (!fiber.isFirstRender) {
      throwRenderedMoreHooks();
    }

    fiber.cells[index] = cell;
    fiber.effectCells.push(cell);
  }

  if (cell.deps !== null && !!deps !== !!cell.deps)
    throw new Error(
      "useEffect called with and without dependencies across re-renders",
    );

  addCommit(fiber, () => {
    cell.setup = effect;
    cell.setupDeps = deps;
    cell.generation++;
  });
}

export function useEffect(
  effect: useEffect.EffectCallback,
  deps?: readonly unknown[],
): void {
  useEffectImpl(effect, deps);
}
