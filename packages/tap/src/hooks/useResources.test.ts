import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
} from "../__tests__/test-utils";
import { resource } from "../core/resource";
import { withKey } from "../core/withKey";
import { useEffect } from "../react-hooks/useEffect";
import { useResources } from "./useResources";

describe("useResources stale fibers", () => {
  afterEach(() => {
    cleanupAllResources();
  });

  it("does not scan fiber keys when a child is only added", () => {
    const Item = resource((key: string) => key);
    const parent = createTestResource((keys: string[]) =>
      useResources(keys.map((key) => withKey(key, Item(key)))),
    );

    expect(renderTest(parent, ["existing"])).toEqual(["existing"]);
    const keysSpy = vi.spyOn(Map.prototype, "keys");
    try {
      expect(renderTest(parent, ["existing", "added"])).toEqual([
        "existing",
        "added",
      ]);
      expect(keysSpy).not.toHaveBeenCalled();
    } finally {
      keysSpy.mockRestore();
    }
  });

  it("preserves cleanup across removal, reorder, replacement, and key reuse", () => {
    const events: string[] = [];
    const Item = resource(function useItem(key: string) {
      useEffect(() => {
        events.push(`mount:${key}`);
        return () => events.push(`unmount:${key}`);
      }, []);
      return key;
    });
    const Replacement = resource(function useReplacement(key: string) {
      useEffect(() => {
        events.push(`mount:replacement-${key}`);
        return () => events.push(`unmount:replacement-${key}`);
      }, []);
      return `replacement-${key}`;
    });
    const parent = createTestResource(
      (keys: string[], replace: boolean = false) =>
        useResources(
          keys.map((key) =>
            withKey(key, replace && key === "a" ? Replacement(key) : Item(key)),
          ),
        ),
    );

    expect(renderTest(parent, ["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(events).toEqual(["mount:a", "mount:b", "mount:c"]);

    expect(renderTest(parent, ["c", "a", "b"])).toEqual(["c", "a", "b"]);
    expect(events).toEqual(["mount:a", "mount:b", "mount:c"]);

    expect(renderTest(parent, ["c", "a"])).toEqual(["c", "a"]);
    expect(events).toEqual(["mount:a", "mount:b", "mount:c", "unmount:b"]);

    expect(renderTest(parent, ["a", "d"])).toEqual(["a", "d"]);
    expect(events).toEqual([
      "mount:a",
      "mount:b",
      "mount:c",
      "unmount:b",
      "unmount:c",
      "mount:d",
    ]);

    expect(renderTest(parent, ["a", "d"], true)).toEqual([
      "replacement-a",
      "d",
    ]);
    expect(events).toEqual([
      "mount:a",
      "mount:b",
      "mount:c",
      "unmount:b",
      "unmount:c",
      "mount:d",
      "unmount:a",
      "mount:replacement-a",
    ]);

    expect(renderTest(parent, ["d"])).toEqual(["d"]);
    expect(renderTest(parent, ["a", "d"])).toEqual(["a", "d"]);
    expect(events).toEqual([
      "mount:a",
      "mount:b",
      "mount:c",
      "unmount:b",
      "unmount:c",
      "mount:d",
      "unmount:a",
      "mount:replacement-a",
      "unmount:replacement-a",
      "mount:a",
    ]);
  });
});
