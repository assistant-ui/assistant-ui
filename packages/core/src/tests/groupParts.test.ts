import { describe, expect, it } from "vitest";
import type { PartState } from "../store/scopes/part";
import {
  buildGroupTree,
  GROUPBY_MEMO_KEY,
  groupPartByType,
  type GroupNode,
} from "../react/utils/groupParts";

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

const part = (overrides: Partial<PartState>): PartState =>
  ({
    type: "text",
    text: "",
    status: { type: "complete" },
    ...overrides,
  }) as PartState;

describe("groupPartByType", () => {
  it("maps part.type to the configured path", () => {
    const fn = groupPartByType({
      reasoning: ["group-thought", "group-reasoning"],
      "tool-call": ["group-thought", "group-tool"],
    });
    expect(fn(part({ type: "reasoning" }))).toEqual([
      "group-thought",
      "group-reasoning",
    ]);
    expect(fn(part({ type: "tool-call" }))).toEqual([
      "group-thought",
      "group-tool",
    ]);
  });

  it("returns [] for part types not in the map", () => {
    const fn = groupPartByType({ reasoning: ["group-r"] });
    expect(fn(part({ type: "text" }))).toEqual([]);
  });

  it("routes MCP-app tool calls through the 'mcp-app' entry when present", () => {
    const fn = groupPartByType({
      "tool-call": ["group-tool"],
      "mcp-app": [],
    });
    const mcpApp = part({
      type: "tool-call",
      toolName: "render",
      mcp: { app: { resourceUri: "ui://my-app" } },
    } as Partial<PartState>);
    const regular = part({
      type: "tool-call",
      toolName: "search",
    } as Partial<PartState>);
    expect(fn(mcpApp)).toEqual([]);
    expect(fn(regular)).toEqual(["group-tool"]);
  });

  it("falls back to 'tool-call' for MCP-app parts when 'mcp-app' is absent", () => {
    const fn = groupPartByType({ "tool-call": ["group-tool"] });
    const mcpApp = part({
      type: "tool-call",
      toolName: "render",
      mcp: { app: { resourceUri: "ui://x" } },
    } as Partial<PartState>);
    expect(fn(mcpApp)).toEqual(["group-tool"]);
  });

  it("does not route non-`ui://` tool calls through 'mcp-app'", () => {
    const fn = groupPartByType({
      "tool-call": ["group-tool"],
      "mcp-app": ["group-mcp"],
    });
    const notMcp = part({
      type: "tool-call",
      toolName: "x",
      mcp: { app: { resourceUri: "http://example.com" } },
    } as Partial<PartState>);
    expect(fn(notMcp)).toEqual(["group-tool"]);
  });

  const standaloneContext = (...names: string[]) => ({
    toolUIs: Object.fromEntries(
      names.map((name) => [name, [{ render: () => null, standalone: true }]]),
    ),
  });

  it("routes context-standalone tool calls through the 'standalone-tool-call' entry", () => {
    const fn = groupPartByType({
      "tool-call": ["group-tool"],
      "standalone-tool-call": [],
    });
    const standalone = part({
      type: "tool-call",
      toolName: "ask_user",
    } as Partial<PartState>);
    const regular = part({
      type: "tool-call",
      toolName: "search",
    } as Partial<PartState>);
    expect(fn(standalone, standaloneContext("ask_user"))).toEqual([]);
    expect(fn(regular, standaloneContext("ask_user"))).toEqual(["group-tool"]);
    // No context → not standalone, falls through to "tool-call".
    expect(fn(standalone)).toEqual(["group-tool"]);
    // Registered but not standalone → also falls through to "tool-call".
    const inlineCtx = {
      toolUIs: { ask_user: [{ render: () => null, standalone: false }] },
    };
    expect(fn(standalone, inlineCtx)).toEqual(["group-tool"]);
  });

  it("leaves regular and standalone tool calls ungrouped when both map to []", () => {
    const fn = groupPartByType({
      reasoning: ["group-chainOfThought", "group-reasoning"],
      "tool-call": [],
      "standalone-tool-call": [],
    });
    const regularTool = part({
      type: "tool-call",
      toolName: "search",
    } as Partial<PartState>);
    const standaloneTool = part({
      type: "tool-call",
      toolName: "ask_user",
    } as Partial<PartState>);

    const paths = [
      fn(part({ type: "reasoning" })),
      fn(regularTool),
      fn(standaloneTool, standaloneContext("ask_user")),
    ];

    // reasoning groups into the chain-of-thought; both tool kinds stay flat.
    expect(paths).toEqual([
      ["group-chainOfThought", "group-reasoning"],
      [],
      [],
    ]);
    expect(dump(buildGroupTree(paths))).toBe(
      "G:group-chainOfThought#0[0]{G:group-reasoning#0.0[0]{P:#0.0.0(0)}},P:#1(1),P:#2(2)",
    );
  });

  it("routes MCP-app parts through 'standalone-tool-call' from the part alone", () => {
    const fn = groupPartByType({
      "tool-call": ["group-tool"],
      "standalone-tool-call": [],
    });
    const mcpApp = part({
      type: "tool-call",
      toolName: "render",
      mcp: { app: { resourceUri: "ui://my-app" } },
    } as Partial<PartState>);
    expect(fn(mcpApp)).toEqual([]);
  });

  it("routes MCP-app parts through the deprecated 'mcp-app' entry", () => {
    const fn = groupPartByType({
      "tool-call": ["group-tool"],
      "mcp-app": ["group-mcp"],
    });
    const mcpApp = part({
      type: "tool-call",
      toolName: "render",
      mcp: { app: { resourceUri: "ui://my-app" } },
    } as Partial<PartState>);
    expect(fn(mcpApp)).toEqual(["group-mcp"]);
  });

  it("prefers 'standalone-tool-call' over the deprecated 'mcp-app' entry", () => {
    const fn = groupPartByType({
      "tool-call": ["group-tool"],
      "standalone-tool-call": ["group-standalone"],
      "mcp-app": ["group-mcp"],
    });
    const mcpApp = part({
      type: "tool-call",
      toolName: "render",
      mcp: { app: { resourceUri: "ui://x" } },
    } as Partial<PartState>);
    expect(fn(mcpApp)).toEqual(["group-standalone"]);
  });

  it("tags the function with a GROUPBY_MEMO_KEY fingerprint", () => {
    const fn = groupPartByType({ reasoning: ["group-r"] });
    const memoKey = (fn as unknown as { [GROUPBY_MEMO_KEY]: string })[
      GROUPBY_MEMO_KEY
    ];
    expect(memoKey).toMatch(/^groupPartByType:/);
  });

  it("produces the same fingerprint regardless of map key order", () => {
    const a = groupPartByType({
      reasoning: ["group-r"],
      "tool-call": ["group-t"],
    });
    const b = groupPartByType({
      "tool-call": ["group-t"],
      reasoning: ["group-r"],
    });
    const keyA = (a as unknown as { [GROUPBY_MEMO_KEY]: string })[
      GROUPBY_MEMO_KEY
    ];
    const keyB = (b as unknown as { [GROUPBY_MEMO_KEY]: string })[
      GROUPBY_MEMO_KEY
    ];
    expect(keyA).toBe(keyB);
  });

  it("produces different fingerprints for different configs", () => {
    const a = groupPartByType({ reasoning: ["group-r"] });
    const b = groupPartByType({ reasoning: ["group-r2"] });
    const keyA = (a as unknown as { [GROUPBY_MEMO_KEY]: string })[
      GROUPBY_MEMO_KEY
    ];
    const keyB = (b as unknown as { [GROUPBY_MEMO_KEY]: string })[
      GROUPBY_MEMO_KEY
    ];
    expect(keyA).not.toBe(keyB);
  });
});

describe("buildGroupTree idKey", () => {
  const ids = (values: readonly (string | undefined)[]) => values;

  it("leaves idKey undefined when partIds is not provided", () => {
    const tree = buildGroupTree(asPaths([["a"], ["a"]]));
    const group = tree[0]!;
    expect(group.idKey).toBeUndefined();
    if (group.type === "group") {
      expect(group.children.every((c) => c.idKey === undefined)).toBe(true);
    }
  });

  it("derives group idKey from the first part of the group", () => {
    const tree = buildGroupTree(asPaths([["a"], ["a"]]), ids(["t1", "t2"]));
    const group = tree[0]!;
    expect(group.idKey).toBe("id:t1");
  });

  it("keeps group idKey undefined when the first part has no id", () => {
    const tree = buildGroupTree(
      asPaths([["a"], ["a"]]),
      ids([undefined, "t2"]),
    );
    expect(tree[0]!.idKey).toBeUndefined();
  });

  it("assigns leaf idKeys and lets a group and its first leaf share an id across levels", () => {
    const tree = buildGroupTree(asPaths([["a"], ["a"]]), ids(["t1", "t2"]));
    const group = tree[0]!;
    if (group.type !== "group") throw new Error("expected group");
    expect(group.idKey).toBe("id:t1");
    expect(group.children.map((c) => c.idKey)).toEqual(["id:t1", "id:t2"]);
  });

  it("demotes duplicate ids among siblings to undefined", () => {
    const tree = buildGroupTree(asPaths([[], [], []]), ids(["t1", "t1", "t2"]));
    expect(tree.map((n) => n.idKey)).toEqual(["id:t1", undefined, "id:t2"]);
  });

  it("keeps a group's idKey stable when parts reorder across rebuilds", () => {
    const live = buildGroupTree(
      asPaths([[], ["a"], [], ["a"]]),
      ids([undefined, "t1", undefined, "t2"]),
    );
    const settled = buildGroupTree(
      asPaths([[], [], ["a"], ["a"]]),
      ids([undefined, undefined, "t1", "t2"]),
    );
    const liveFirstGroup = live.find((n) => n.type === "group")!;
    const settledGroup = settled.find((n) => n.type === "group")!;
    expect(liveFirstGroup.idKey).toBe("id:t1");
    expect(settledGroup.idKey).toBe("id:t1");
  });
});
