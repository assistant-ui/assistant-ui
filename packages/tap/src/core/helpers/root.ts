import type {
  ChangelogRecord,
  ReducerCell,
  ResourceFiber,
  TapRoot,
} from "../types";
import { cloneCurrentTapContext } from "../context";
import { CommitPriority } from "./commit";
import { isDevelopment } from "./env";

export const createResourceFiberRoot = (
  dispatchUpdate: (evaluate: () => boolean, apply: () => boolean) => void,
): TapRoot => {
  return {
    version: 0,
    committedVersion: 0,
    context: cloneCurrentTapContext(),
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

    if (version === root.committedVersion) {
      root.changelog.length = 0;
    } else if (root.committedVersion > version) {
      // React concurrent rendering can replay a reducer from a base older than
      // the last commit; clamp to the committed state instead of throwing so
      // the next committed render restores consistency.
      if (isDevelopment) {
        console.error(
          `tap: setRootVersion received version ${version} below committed ` +
            `${root.committedVersion}; clamping to the committed state.`,
        );
      }
      root.version = root.committedVersion;
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
  markReducerDirty(record.fiber, record.cell);
  if (!record.queued) {
    record.queued = true;
    (record.cell.queue ??= []).push(record);
  }
};

export const addCommit = (
  fiber: ResourceFiber<any>,
  priority: CommitPriority,
  callback: () => void,
): void => {
  const callbacks = fiber.wipCommitCallbacks!;
  (callbacks[priority] ??= []).push(callback);
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
