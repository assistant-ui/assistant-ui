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

  it("accepts a version below the committed version and keeps it", () => {
    const root = makeRoot();
    setRootVersion(root, 3);
    commitRoot(root);
    expect(root.committedVersion).toBe(3);

    pushRecord(root);
    expect(() => setRootVersion(root, 1)).not.toThrow();
    expect(root.version).toBe(1);
    expect(root.committedVersion).toBe(3);
    expect(root.changelog.length).toBe(0);
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
