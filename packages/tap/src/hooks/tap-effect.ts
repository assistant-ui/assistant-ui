import { getCurrentResourceFiber } from "../core/execution-context";
import { EffectCallback, Cell } from "../core/types";

function getEffectCell(): number {
  const executionContext = getCurrentResourceFiber();
  const index = executionContext.currentIndex++;

  // Check if we're trying to use more hooks than in previous renders
  if (
    !executionContext.isFirstRender &&
    index >= executionContext.cells.length
  ) {
    throw new Error(
      "Rendered more hooks than during the previous render. " +
        "Hooks must be called in the exact same order in every render."
    );
  }

  if (!executionContext.cells[index]) {
    // Create the effect cell
    const cell: Cell & { type: "effect" } = {
      type: "effect",
      mounted: false,
    };

    executionContext.cells[index] = cell;
  }

  const cell = executionContext.cells[index];
  if (cell.type !== "effect") {
    throw new Error("Hook order changed between renders");
  }

  return index;
}

export function tapEffect(effect: EffectCallback): void;
export function tapEffect(
  effect: EffectCallback,
  deps: readonly unknown[]
): void;
export function tapEffect(
  effect: EffectCallback,
  deps?: readonly unknown[]
): void {
  const executionContext = getCurrentResourceFiber();

  // Reserve a spot for the effect cell and get its index
  const cellIndex = getEffectCell();

  // Add task to render context for execution in commit phase
  executionContext.commitTasks.push({ effect, deps, cellIndex });
}
