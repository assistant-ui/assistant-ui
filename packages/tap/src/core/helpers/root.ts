import type {
  ChangelogRecord,
  ReducerCell,
  ResourceFiber,
  TapRoot,
} from "../types";
import { isDevelopment } from "./env";
export const createResourceFiberRoot = (
  dispatchUpdate: (evaluate: () => boolean, apply: () => boolean) => void,
): TapRoot => {
  return {
    version: 0,
    committedVersion: 0,
    dispatchUpdate,
    changelog: [],
    committedLog: [],
    unsettledCount: 0,
    rollbackCallbacks: [],
  };
};

// The committed log retains committed records while any dispatched record is
// still unsettled, so a below-committed replay can rewind cells to the state
// at its base; once everything settles no replay can reach below and the
// history is dropped. Retention is one record, holding one state snapshot,
// per commit that lands while a lane stays pending.
export const commitRoot = (root: TapRoot): void => {
  root.committedVersion = root.version;
  for (const record of root.changelog) {
    record.logged = false;
    if (!record.settled) {
      record.settled = true;
      root.unsettledCount--;
    }
    root.committedLog.push(record);
  }
  root.changelog.length = 0;
  if (root.unsettledCount === 0) root.committedLog.length = 0;
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
      // from an older base; the replayed chain re-supplies its updates.
      // Committed records above that base are rewound so replayed updates
      // reduce from the state at the base; the commit path drops the armed
      // restore, while a discarded replay restores the log and the committed
      // version through it.
      const rewound: {
        record: ChangelogRecord;
        prevState: any;
        eagerState: any;
        hasEagerState: boolean;
      }[] = [];
      while (root.committedVersion - rewound.length > version) {
        const record = root.committedLog.pop();
        if (record === undefined) {
          if (isDevelopment) {
            throw new Error(
              "tap: committed history is shorter than the replay base.",
            );
          }
          break;
        }
        markReducerDirty(record.fiber, record.cell);
        record.cell.workInProgress = record.prevState;
        rewound.push({
          record,
          prevState: record.prevState,
          eagerState: record.eagerState,
          hasEagerState: record.hasEagerState,
        });
      }
      if (rewound.length > 0) {
        const restoredVersion = root.committedVersion;
        // A discarded replay has re-drained the popped records against its own
        // base, so the restore rewrites their application snapshots back to
        // committed history alongside the log and the committed version.
        addRollback(root, () => {
          for (let i = rewound.length - 1; i >= 0; i--) {
            const entry = rewound[i]!;
            entry.record.prevState = entry.prevState;
            entry.record.eagerState = entry.eagerState;
            entry.record.hasEagerState = entry.hasEagerState;
            root.committedLog.push(entry.record);
          }
          root.committedVersion = restoredVersion;
        });
      }
      root.committedVersion = version;
      for (const record of root.changelog) record.logged = false;
      root.changelog.length = 0;
    } else {
      // commit happened without a useEffect update (offscreen API)

      while (root.committedVersion + root.changelog.length > version) {
        root.changelog.pop()!.logged = false;
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
