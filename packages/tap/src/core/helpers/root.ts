import { Cell, ResourceFiber, ResourceFiberRoot } from "../types";

export const commitRoot = (root: ResourceFiberRoot): void => {
  for (const cell of root.dirtyCells) {
    cell.dirty = false;
    cell.queue.clear();
    cell.current = cell.workInProgress;
  }
  root.dirtyCells.length = 0;
};

export const setRootVersion = (
  root: ResourceFiberRoot,
  version: number,
): void => {
  if (root.version > version) {
    for (const cell of root.dirtyCells) {
      cell.dirty = false;
      cell.queue.clear();
      cell.workInProgress = cell.current;
    }
    root.dirtyCells.length = 0;
  }

  root.version = version;
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
