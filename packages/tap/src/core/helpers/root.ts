import type {
  ChangelogRecord,
  ReducerCell,
  ResourceFiber,
  TapRoot,
} from "../types";
export const createResourceFiberRoot = (
  dispatchUpdate: (evaluate: () => boolean, apply: () => boolean) => void,
): TapRoot => {
  return {
    version: 0,
    committedVersion: 0,
    dispatchUpdate,
    changelog: [],
    rollbackCallbacks: [],
  };
};

export const commitRoot = (root: TapRoot): void => {
  root.committedVersion = root.version;
  root.changelog.length = 0;
  root.rollbackCallbacks.length = 0;
};

export const setRootVersion = (root: TapRoot, version: number): void => {
  const rollback = root.version > version;
  root.version = version;
  if (rollback) {
    for (let i = 0; i < root.rollbackCallbacks.length; i++) {
      root.rollbackCallbacks[i]!();
    }
    root.rollbackCallbacks.length = 0;

    if (version <= root.committedVersion) {
      // A version below the last commit is a React concurrent reducer replay
      // from an older base; the replayed chain re-supplies its updates. The
      // committed version re-bases to keep the changelog's base derivation in
      // the branch below correct; the next commit overwrites it.
      root.committedVersion = version;
      root.changelog.length = 0;
    } else {
      // commit happened without a useEffect update (offscreen API)

      while (root.committedVersion + root.changelog.length > version) {
        root.changelog.pop();
      }

      for (let i = 0; i < root.changelog.length; i++) {
        applyChangelogRecord(root.changelog[i]!);
      }
      commitRoot(root);
    }
  }
};

export const applyChangelogRecord = (record: ChangelogRecord): void => {
  const { cell, fiber } = record;
  // A replay's first re-applied record rewinds the cell to its dispatch-time
  // base, valid exactly when that base is the current committed floor. A floor
  // above the dispatch base has no snapshot and keeps committed state.
  const restoreBase =
    !cell.isDirty && record.baseVersion === fiber.root.committedVersion;

  markReducerDirty(fiber, cell);
  if (restoreBase) cell.workInProgress = record.baseState;
  if (!record.queued) {
    record.queued = true;
    (cell.queue ??= []).push(record);
  }
};

export const addCommit = (
  fiber: ResourceFiber<any>,
  callback: () => void,
): void => {
  fiber.wipCommitCallbacks!.push(callback);
};

export const addRollback = (root: TapRoot, callback: () => void): void => {
  root.rollbackCallbacks.push(callback);
};

export const markReducerDirty = (
  fiber: ResourceFiber<any>,
  cell: ReducerCell,
): void => {
  if (cell.isDirty) return;

  cell.isDirty = true;
  fiber.markDirty?.();
  addRollback(fiber.root, () => {
    if (cell.queue !== null) {
      for (const record of cell.queue) record.queued = false;
      cell.queue = null;
    }
    cell.workInProgress = cell.current;
    cell.isDirty = false;
  });
};
