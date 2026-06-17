import { describe, expect, it } from "vitest";
import { buildRawNav, sliceHint } from "./rawNodes";

describe("buildRawNav", () => {
  it("orders known slices and groups scopes separately", () => {
    const groups = buildRawNav({
      id: 1,
      state: {
        mcp: { servers: [] },
        composer: { text: "hi", textLength: 2 },
        thread: { messages: [{ id: "m1" }], isRunning: false },
        tools: { search: ["SearchUI"] },
      },
      logs: [],
      scopes: [{ name: "thread", source: "root", methods: ["send"] }],
    });

    expect(groups.map((group) => group.label)).toEqual(["State", "Graph"]);
    const sliceKeys = groups[0]!.nodes.map((node) =>
      node.kind === "slice" ? node.key : null,
    );
    expect(sliceKeys).toEqual(["thread", "composer", "tools", "mcp"]);
  });
});

describe("sliceHint", () => {
  it("summarizes thread and composer slices", () => {
    expect(
      sliceHint("thread", {
        messages: [{ id: "m1" }, { id: "m2" }],
        isRunning: false,
      }),
    ).toBe("2 msgs");
    expect(sliceHint("composer", { text: "hello", textLength: 5 })).toBe(
      "5 chars",
    );
  });
});
