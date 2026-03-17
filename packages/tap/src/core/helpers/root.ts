import { Cell, ResourceFiber, ResourceFiberRoot } from "../types";

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
  for (const cell of root.dirtyCells) {
    cell.dirty = false;
    cell.queue.clear();
    cell.current = cell.workInProgress;
  }
  root.committedVersion = root.version;
  root.changelog.length = 0;
  root.dirtyCells.length = 0;
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
