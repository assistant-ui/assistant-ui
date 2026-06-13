import type {
  ChangelogRecord,
  ReducerCell,
  ResourceFiber,
  ResourceFiberRoot,
} from "../types";
import { CommitPriority } from "./commit";

export const createResourceFiberRoot = (
  dispatchUpdate: (evaluate: () => boolean, apply: () => boolean) => void,
): ResourceFiberRoot => {
  return {
    version: 0,
    committedVersion: 0,
    dispatchUpdate,
    changelog: [],
    rollbackCallbacks: [],
  };
};

export const commitRoot = (root: ResourceFiberRoot): void => {
  root.committedVersion = root.version;
  root.changelog.length = 0;
  root.rollbackCallbacks.length = 0;
};

export const setRootVersion = (
  root: ResourceFiberRoot,
  version: number,
): void => {
  const rollback = root.version > version;
  root.version = version;
  if (rollback) {
    for (let i = 0; i < root.rollbackCallbacks.length; i++) {
      root.rollbackCallbacks[i]!();
    }
    root.rollbackCallbacks.length = 0;

    if (version === root.committedVersion) {
      root.changelog.length = 0;
    } else {
      // commit happened without a useEffect update (offscreen API)

      if (root.committedVersion > version)
        throw new Error("Version is less than committed version");

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
  markReducerDirty(record.fiber, record.cell);
  if (!record.queued) {
    record.queued = true;
    (record.cell.queue ??= []).push(record);
  }
};

export const addCommit = (
  fiber: ResourceFiber<any, any>,
  priority: CommitPriority,
  callback: () => void,
): void => {
  const callbacks = fiber.renderContext!.commitCallbacks;
  (callbacks[priority] ??= []).push(callback);
};

export const addRollback = (
  root: ResourceFiberRoot,
  callback: () => void,
): void => {
  root.rollbackCallbacks.push(callback);
};

export const markReducerDirty = (
  fiber: ResourceFiber<any, any>,
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
