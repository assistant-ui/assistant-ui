import { Cell, ResourceFiber, ResourceFiberRoot } from "../types";

export const commitRoot = (root: ResourceFiberRoot): void => {
  for (const cell of root.dirtyCells) {
    cell.dirty = false;
    cell.queue.length = 0;
    cell.current = cell.workInProgress;
  }
  root.dirtyCells.length = 0;
};

export const resetRoot = (root: ResourceFiberRoot): void => {
  for (const cell of root.dirtyCells) {
    cell.dirty = false;
    cell.queue.length = 0;
    cell.workInProgress = cell.current;
  }
  root.dirtyCells.length = 0;
};

export const markCellDirty = (
  fiber: ResourceFiber<any, any>,
  cell: Cell & { type: "reducer" },
): void => {
  if (!cell.dirty) {
    cell.dirty = true;
    fiber.markDirty?.();
    fiber.root.dirtyCells.push(cell);
  }
};
