import { describe, expect, it } from "vitest";
import { diffValues } from "./diff";

describe("diffValues", () => {
  it("returns no entries for equal values", () => {
    expect(diffValues({ a: 1, b: "x" }, { a: 1, b: "x" })).toEqual([]);
  });

  it("detects added, removed, and changed keys by path", () => {
    const entries = diffValues(
      { kept: 1, dropped: 2, moved: "a" },
      { kept: 1, added: 3, moved: "b" },
    );
    const byPath = Object.fromEntries(entries.map((e) => [e.path, e.kind]));
    expect(byPath).toEqual({
      dropped: "removed",
      added: "added",
      moved: "changed",
    });
  });

  it("recurses into nested objects with dotted paths", () => {
    const entries = diffValues(
      { outer: { inner: 1 } },
      { outer: { inner: 2 } },
    );
    expect(entries).toEqual([
      { path: "outer.inner", kind: "changed", before: 1, after: 2 },
    ]);
  });

  it("treats arrays as whole leaves", () => {
    const entries = diffValues({ list: [1, 2] }, { list: [1, 2, 3] });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ path: "list", kind: "changed" });
  });
});
