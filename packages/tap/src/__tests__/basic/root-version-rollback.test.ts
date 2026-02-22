import { describe, expect, it } from "vitest";
import {
  createResourceFiberRoot,
  setRootVersion,
} from "../../core/helpers/root";

describe("setRootVersion", () => {
  it("clamps rollbacks below committed version instead of throwing", () => {
    const root = createResourceFiberRoot(() => {});
    root.version = 6;
    root.committedVersion = 4;

    expect(() => setRootVersion(root, 2)).not.toThrow();
    expect(root.version).toBe(4);
    expect(root.committedVersion).toBe(4);
  });

  it("replays changelog when rollback target is still after committed version", () => {
    const root = createResourceFiberRoot(() => {});
    let replayed = 0;

    root.version = 6;
    root.committedVersion = 4;
    root.changelog.push(
      () => {
        replayed += 1;
      },
      () => {
        replayed += 1;
      },
    );

    setRootVersion(root, 5);

    expect(replayed).toBe(1);
    expect(root.version).toBe(5);
    expect(root.committedVersion).toBe(5);
    expect(root.changelog).toHaveLength(0);
  });
});
