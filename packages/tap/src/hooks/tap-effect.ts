import { getCurrentResourceFiber } from "../core/execution-context";
import { Cell } from "../core/types";

function getEffectCell(): number {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;

  // Check if we're trying to use more hooks than in previous renders
  if (!fiber.isFirstRender && index >= fiber.cells.length) {
    throw new Error(
      "Rendered more hooks than during the previous render. " +
        "Hooks must be called in the exact same order in every render.",
    );
  }

  if (!fiber.cells[index]) {
    // Create the effect cell
    const cell: Cell & { type: "effect" } = {
      type: "effect",
      mounted: false,
    };

    fiber.cells[index] = cell;
  }

  const cell = fiber.cells[index];
  if (cell.type !== "effect") {
    throw new Error("Hook order changed between renders");
  }

  return index;
}

export namespace tapEffect {
  export type Destructor = () => void;
  export type EffectCallback = () => void | Destructor;
}

export function tapEffect(effect: tapEffect.EffectCallback): void;
export function tapEffect(
  effect: tapEffect.EffectCallback,
  deps: readonly unknown[],
): void;
export function tapEffect(
  effect: tapEffect.EffectCallback,
  deps?: readonly unknown[],
): void {
  const fiber = getCurrentResourceFiber();

  // Reserve a spot for the effect cell and get its index
  const cellIndex = getEffectCell();

  // Add task to render context for execution in commit phase
  fiber.renderContext!.commitTasks.push({
    effect,
    deps,
    cellIndex,
  });
}
