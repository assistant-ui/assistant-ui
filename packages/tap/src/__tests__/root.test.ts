import { describe, it, expect, vi, afterEach } from "vitest";
import {
  commitRoot,
  createResourceFiberRoot,
  setRootVersion,
} from "../core/helpers/root";
import type { TapRoot } from "../core/types";

const makeRoot = (): TapRoot => createResourceFiberRoot(() => {});

describe("setRootVersion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rolls back to the committed version and clears the changelog", () => {
    const root = makeRoot();
    // Advance past the committed version without committing (pending work).
    setRootVersion(root, 5);
    expect(root.version).toBe(5);
    expect(root.committedVersion).toBe(0);

    // Rolling back to the committed version takes the committed-version branch
    // and clears the changelog.
    setRootVersion(root, 0);
    expect(root.version).toBe(0);
    expect(root.changelog.length).toBe(0);
  });

  it("clamps to the committed state instead of throwing when a React concurrent reducer replay passes a version below committed", () => {
    const root = makeRoot();
    setRootVersion(root, 3);
    commitRoot(root);
    expect(root.committedVersion).toBe(3);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // React 19 concurrent rendering can replay a reducer from a base state
    // older than the last commit (update rebase after an interrupted lane).
    // The replayed version (1) is below the committed version (3); setRootVersion
    // must clamp back up to the committed state instead of throwing.
    expect(() => setRootVersion(root, 1)).not.toThrow();

    expect(root.version).toBe(3);
    expect(root.committedVersion).toBe(3);
    expect(root.changelog.length).toBe(0);
    expect(root.rollbackCallbacks.length).toBe(0);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("runs rollback callbacks before clamping to the committed state", () => {
    const root = makeRoot();
    setRootVersion(root, 3);
    commitRoot(root);

    let rolledBack = false;
    root.rollbackCallbacks.push(() => {
      rolledBack = true;
    });

    vi.spyOn(console, "error").mockImplementation(() => {});
    setRootVersion(root, 1);

    expect(rolledBack).toBe(true);
    expect(root.rollbackCallbacks.length).toBe(0);
  });
});
