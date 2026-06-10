import type { Cell, ResourceFiber, ResourceFiberRoot } from "../types";

export const createResourceFiberRoot = (
  dispatchUpdate: (cb: () => boolean) => void,
): ResourceFiberRoot => {
  return {
    version: 0,
    committedVersion: 0,
    dispatchUpdate,
    changelog: [],
    dirtyCells: [],
  };
};

export const commitRoot = (root: ResourceFiberRoot): void => {
  // A cell whose queue still holds entries was updated after the committed
  // render (e.g. a dispatch from an effect during this commit). It stays
  // dirty so the next render processes it.
  const pending: (Cell & { type: "reducer" })[] = [];
  for (const cell of root.dirtyCells) {
    cell.current = cell.workInProgress;
    if (cell.queue.size > 0) {
      pending.push(cell);
    } else {
      cell.dirty = false;
    }
  }
  root.committedVersion = root.version;
  root.changelog.length = 0;
  root.dirtyCells.length = 0;
  root.dirtyCells.push(...pending);
};

export const setRootVersion = (
  root: ResourceFiberRoot,
  version: number,
): void => {
  const rollback = root.version > version;
  root.version = version;
  if (rollback) {
    for (const cell of root.dirtyCells) {
      cell.dirty = false;
      cell.queue.clear();
      cell.workInProgress = cell.current;
    }
    root.dirtyCells.length = 0;

    if (version === root.committedVersion) {
      root.changelog.length = 0;
    } else {
      // commit happened without a useEffect update (offscreen API)

      if (root.committedVersion > version)
        throw new Error("Version is less than committed version");

      while (root.committedVersion + root.changelog.length > version) {
        root.changelog.pop();
      }

      root.changelog.forEach((apply) => apply());
      commitRoot(root);
    }
  }
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
