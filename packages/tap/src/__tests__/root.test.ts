import { describe, it, expect } from "vitest";
import {
  commitRoot,
  createResourceFiberRoot,
  setRootVersion,
} from "../core/helpers/root";
import type { ChangelogRecord } from "../core/types";

const makeRoot = () => createResourceFiberRoot(() => {});

const pushRecord = (root: ReturnType<typeof makeRoot>) => {
  root.changelog.push({ settled: true } as ChangelogRecord);
};

const committedRecord = (
  root: ReturnType<typeof makeRoot>,
  cell: object,
  prevState: unknown,
): ChangelogRecord =>
  ({
    fiber: { root, markDirty: undefined },
    cell,
    prevState,
    hasEagerState: false,
    eagerState: undefined,
    settled: false,
    queued: false,
    logged: true,
  }) as unknown as ChangelogRecord;

describe("setRootVersion", () => {
  it("clears the changelog when rolling back to the committed version", () => {
    const root = makeRoot();
    setRootVersion(root, 5);
    expect(root.version).toBe(5);
    expect(root.committedVersion).toBe(0);

    pushRecord(root);
    setRootVersion(root, 0);
    expect(root.version).toBe(0);
    expect(root.changelog.length).toBe(0);
  });

  it("clears changelog membership when records are removed", () => {
    const root = makeRoot();
    const movedRecord = { logged: true, settled: true } as ChangelogRecord;
    root.changelog.push(movedRecord);
    commitRoot(root);
    expect(movedRecord.logged).toBe(false);

    const cell = {
      isDirty: false,
      queue: null,
      workInProgress: "s",
      current: "s",
    };
    root.unsettledCount = 3;
    setRootVersion(root, 2);
    root.changelog.push(
      committedRecord(root, cell, "p1"),
      committedRecord(root, cell, "p2"),
    );
    commitRoot(root);
    setRootVersion(root, 3);
    commitRoot(root);
    const belowCommittedRecord = {
      logged: true,
      settled: true,
    } as ChangelogRecord;
    root.changelog.push(belowCommittedRecord);
    setRootVersion(root, 1);
    expect(belowCommittedRecord.logged).toBe(false);
  });

  it("re-bases to a version below the committed version instead of throwing", () => {
    const root = makeRoot();
    const cell = {
      isDirty: false,
      queue: null,
      workInProgress: "s",
      current: "s",
    };
    root.unsettledCount = 4;
    setRootVersion(root, 3);
    root.changelog.push(
      committedRecord(root, cell, "p1"),
      committedRecord(root, cell, "p2"),
      committedRecord(root, cell, "p3"),
    );
    commitRoot(root);
    expect(root.committedVersion).toBe(3);

    pushRecord(root);
    expect(() => setRootVersion(root, 1)).not.toThrow();
    expect(root.version).toBe(1);
    expect(root.committedVersion).toBe(1);
    expect(root.changelog.length).toBe(0);
  });

  it("keeps changelog records relative to the re-based version on a partial rollback", () => {
    const root = makeRoot();
    setRootVersion(root, 3);
    commitRoot(root);
    expect(root.committedVersion).toBe(3);

    setRootVersion(root, 7);
    const marked: number[] = [];
    const trackedRecord = (index: number): ChangelogRecord =>
      ({
        fiber: {
          root,
          markDirty: () => {
            marked.push(index);
          },
        },
        cell: { isDirty: false, queue: null },
        queued: true,
        logged: true,
        settled: true,
      }) as unknown as ChangelogRecord;
    const records = [
      trackedRecord(1),
      trackedRecord(2),
      trackedRecord(3),
      trackedRecord(4),
    ];
    root.changelog.push(...records);

    setRootVersion(root, 6);
    expect(marked).toEqual([1, 2, 3]);
    expect(root.committedVersion).toBe(6);
    expect(root.changelog.length).toBe(0);
    expect(records.every((record) => !record.logged)).toBe(true);
  });

  it("rewinds committed records to their pre-application state on a below-committed replay", () => {
    const root = makeRoot();
    const cell = {
      isDirty: false,
      queue: null,
      workInProgress: "s1",
      current: "s1",
    };
    const record = committedRecord(root, cell, "base");

    root.unsettledCount = 2;
    setRootVersion(root, 1);
    root.changelog.push(record);
    commitRoot(root);
    expect(root.committedLog).toEqual([record]);

    setRootVersion(root, 0);
    expect(cell.workInProgress).toBe("base");
    expect(cell.isDirty).toBe(true);
    expect(root.committedLog.length).toBe(0);
    expect(root.committedVersion).toBe(0);
  });

  it("restores the committed log and version when a rewound replay is discarded", () => {
    const root = makeRoot();
    const cell = {
      isDirty: false,
      queue: null,
      workInProgress: "s2",
      current: "s2",
    };
    const recordA = committedRecord(root, cell, "p1");
    const recordB = committedRecord(root, cell, "p2");

    root.unsettledCount = 3;
    setRootVersion(root, 1);
    root.changelog.push(recordA);
    commitRoot(root);
    setRootVersion(root, 2);
    root.changelog.push(recordB);
    commitRoot(root);
    expect(root.committedLog).toEqual([recordA, recordB]);

    setRootVersion(root, 1);
    expect(cell.workInProgress).toBe("p2");
    expect(root.committedLog).toEqual([recordA]);
    expect(root.committedVersion).toBe(1);

    recordB.prevState = "rewritten";
    recordB.eagerState = "rewritten";
    recordB.hasEagerState = true;

    setRootVersion(root, 3);
    setRootVersion(root, 2);
    expect(root.committedVersion).toBe(2);
    expect(root.committedLog).toEqual([recordA, recordB]);
    expect(recordB.prevState).toBe("p2");
    expect(recordB.eagerState).toBeUndefined();
    expect(recordB.hasEagerState).toBe(false);
    expect(cell.workInProgress).toBe("s2");

    setRootVersion(root, 1);
    expect(cell.workInProgress).toBe("p2");
    expect(root.committedLog).toEqual([recordA]);

    setRootVersion(root, 0);
    expect(root.committedVersion).toBe(0);
    expect(cell.workInProgress).toBe("p1");
    expect(root.committedLog.length).toBe(0);
  });

  it("throws in development when committed history cannot cover the replay base", () => {
    const root = makeRoot();
    const cell = {
      isDirty: false,
      queue: null,
      workInProgress: "s",
      current: "s",
    };
    root.unsettledCount = 2;
    setRootVersion(root, 2);
    root.changelog.push(committedRecord(root, cell, "p1"));
    commitRoot(root);

    expect(() => setRootVersion(root, 0)).toThrow(
      "committed history is shorter than the replay base",
    );
  });

  it("throws in development when the committed log is empty at a below-committed replay", () => {
    const root = makeRoot();
    root.unsettledCount = 1;
    setRootVersion(root, 2);
    commitRoot(root);

    expect(() => setRootVersion(root, 0)).toThrow(
      "committed history is shorter than the replay base",
    );
  });

  it("drops committed history once every dispatched record settles", () => {
    const root = makeRoot();
    const record = {
      settled: false,
      logged: true,
      queued: false,
    } as ChangelogRecord;
    root.unsettledCount = 1;
    setRootVersion(root, 1);
    root.changelog.push(record);
    commitRoot(root);
    expect(root.unsettledCount).toBe(0);
    expect(root.committedLog.length).toBe(0);
  });

  it("runs rollback callbacks when replaying below the committed version", () => {
    const root = makeRoot();
    setRootVersion(root, 3);
    commitRoot(root);
    setRootVersion(root, 5);

    let rolledBack = false;
    root.rollbackCallbacks.push(() => {
      rolledBack = true;
    });

    setRootVersion(root, 3);
    expect(rolledBack).toBe(true);
    expect(root.rollbackCallbacks.length).toBe(0);
  });
});
