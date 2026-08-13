import { describe, it, expect } from "vitest";
import {
  commitRoot,
  createResourceFiberRoot,
  setRootVersion,
} from "../core/helpers/root";
import type { ChangelogRecord } from "../core/types";

const makeRoot = () => createResourceFiberRoot(() => {});

const pushRecord = (root: ReturnType<typeof makeRoot>) => {
  root.changelog.push({} as ChangelogRecord);
};

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
    const committedRecord = { logged: true } as ChangelogRecord;
    root.changelog.push(committedRecord);
    commitRoot(root);
    expect(committedRecord.logged).toBe(false);

    setRootVersion(root, 3);
    commitRoot(root);
    const belowCommittedRecord = { logged: true } as ChangelogRecord;
    root.changelog.push(belowCommittedRecord);
    setRootVersion(root, 1);
    expect(belowCommittedRecord.logged).toBe(false);
  });

  it("re-bases to a version below the committed version instead of throwing", () => {
    const root = makeRoot();
    setRootVersion(root, 3);
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
    setRootVersion(root, 5);
    commitRoot(root);

    setRootVersion(root, 3);
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

  it("runs rollback callbacks when replaying below the committed version", () => {
    const root = makeRoot();
    setRootVersion(root, 3);
    commitRoot(root);

    let rolledBack = false;
    root.rollbackCallbacks.push(() => {
      rolledBack = true;
    });

    setRootVersion(root, 1);
    expect(rolledBack).toBe(true);
    expect(root.rollbackCallbacks.length).toBe(0);
  });
});
