import { getCurrentResourceFiber } from "../../core/helpers/execution-context";
import { Cell } from "../../core/types";

export const tapHook = <T extends Cell["type"]>(
  type: T,
  init: () => Cell,
): Cell & { type: T } => {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;

  if (!fiber.isFirstRender && index >= fiber.cells.length) {
    // Check if we're trying to use more hooks than in previous renders
    throw new Error(
      "Rendered more hooks than during the previous render. " +
        "Hooks must be called in the exact same order in every render.",
    );
  }

  let cell = fiber.cells[index];
  if (!cell) {
    cell = init();
    fiber.cells[index] = cell;
  }

  if (cell.type !== type) {
    throw new Error("Hook order changed between renders");
  }

  return cell as Cell & { type: T };
};

export const registerRenderMountTask = (task: () => void) => {
  const fiber = getCurrentResourceFiber();
  fiber.renderContext!.effectTasks.push(task);
};
