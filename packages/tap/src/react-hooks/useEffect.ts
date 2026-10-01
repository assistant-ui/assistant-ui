import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { addCommit } from "../core/helpers/root";
import type { EffectCell } from "../core/types";
import {
  throwHookOrderChanged,
  throwRenderedMoreHooks,
} from "./utils/hookErrors";

const newEffect = (type: EffectCell["type"]): EffectCell => ({
  type,
  setup: undefined,
  setupDeps: undefined,
  cleanup: undefined,
  deps: null,
  generation: 0,
});

export namespace useEffect {
  export type Destructor = () => void;
  export type EffectCallback = () => Destructor | undefined;
}

export function useEffectImpl(
  effect: useEffect.EffectCallback,
  deps: readonly unknown[] | undefined,
  type: EffectCell["type"],
): void {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;

  const existing = fiber.cells[index];
  const cell: EffectCell =
    existing === undefined
      ? newEffect(type)
      : existing.type === type
        ? existing
        : throwHookOrderChanged();

  if (existing === undefined) {
    if (!fiber.isFirstRender) {
      throwRenderedMoreHooks();
    }

    fiber.cells[index] = cell;
    if (type === "insertion") (fiber.insertionCells ??= []).push(cell);
    else fiber.effectCells.push(cell);
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

export function useEffect(effect: useEffect.EffectCallback): void;
export function useEffect(
  effect: useEffect.EffectCallback,
  deps: readonly unknown[],
): void;
export function useEffect(
  effect: useEffect.EffectCallback,
  deps?: readonly unknown[],
): void {
  useEffectImpl(effect, deps, "effect");
}
