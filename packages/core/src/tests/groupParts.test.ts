import { describe, expect, it } from "vitest";
import { buildGroupTree, type GroupNode } from "../react/utils/groupParts";

const asPaths = (keys: readonly (readonly string[])[]) => keys;

// Compact tree dump: "G:key#nodeKey[i,j]{...}" | "P:#nodeKey(i)"
const dump = (nodes: readonly GroupNode[]): string =>
  nodes
    .map((n) => {
      if (n.type === "part") {
        return `P:#${n.nodeKey}(${n.index})`;
      }
      const inner = dump(n.children);
      return `G:${n.key}#${n.nodeKey}[${n.indices.join(",")}]{${inner}}`;
    })
    .join(",");

describe("buildGroupTree", () => {
  it("returns an empty list for no parts", () => {
    expect(buildGroupTree([])).toEqual([]);
  });

  it("emits one part leaf per ungrouped part (no coalescing)", () => {
    const tree = buildGroupTree(asPaths([[], [], []]));
    expect(dump(tree)).toBe("P:#0(0),P:#1(1),P:#2(2)");
  });

  it("wraps adjacent same-key parts in one group with one part child each", () => {
    const tree = buildGroupTree(asPaths([["a"], ["a"], ["a"]]));
    expect(dump(tree)).toBe("G:a#0[0,1,2]{P:#0.0(0),P:#0.1(1),P:#0.2(2)}");
  });

  it("splits non-adjacent runs of the same key into separate groups", () => {
    const tree = buildGroupTree(asPaths([["a"], [], ["a"]]));
    expect(dump(tree)).toBe("G:a#0[0]{P:#0.0(0)},P:#1(1),G:a#2[2]{P:#2.0(2)}");
  });

  it("nests groups: parts at depth 1 sit alongside depth-2 subgroups", () => {
    // ["A","B"], ["A","B"], ["A"], ["A"], ["A","C"]:
    // Outer A spans 0..4. Inside A: a B subgroup (0,1), two depth-1 parts
    // (2,3), then a C subgroup (4).
    const tree = buildGroupTree(
      asPaths([["A", "B"], ["A", "B"], ["A"], ["A"], ["A", "C"]]),
    );
    expect(dump(tree)).toBe(
      "G:A#0[0,1,2,3,4]{G:B#0.0[0,1]{P:#0.0.0(0),P:#0.0.1(1)},P:#0.1(2),P:#0.2(3),G:C#0.3[4]{P:#0.3.0(4)}}",
    );
  });

  it("treats longer prefix changes as group close+open", () => {
    // ["A","B"], ["A","B","C"], ["A","B"]: opens C under B, closes back.
    const tree = buildGroupTree(
      asPaths([
        ["A", "B"],
        ["A", "B", "C"],
        ["A", "B"],
      ]),
    );
    expect(dump(tree)).toBe(
      "G:A#0[0,1,2]{G:B#0.0[0,1,2]{P:#0.0.0(0),G:C#0.0.1[1]{P:#0.0.1.0(1)},P:#0.0.2(2)}}",
    );
  });

  it("does not coalesce same-keyed groups separated by a divergent sibling", () => {
    const tree = buildGroupTree(
      asPaths([
        ["A", "B"],
        ["A", "C"],
        ["A", "B"],
      ]),
    );
    expect(dump(tree)).toBe(
      "G:A#0[0,1,2]{G:B#0.0[0]{P:#0.0.0(0)},G:C#0.1[1]{P:#0.1.0(1)},G:B#0.2[2]{P:#0.2.0(2)}}",
    );
  });

  it("assigns stable nodeKeys under append (existing keys do not shift)", () => {
    const before = buildGroupTree(asPaths([["A"], []]));
    const after = buildGroupTree(asPaths([["A"], [], ["B"]]));

    expect(before[0]!.nodeKey).toBe(after[0]!.nodeKey);
    expect(before[1]!.nodeKey).toBe(after[1]!.nodeKey);
    expect(after[2]!.nodeKey).toBe("2");
  });
});
