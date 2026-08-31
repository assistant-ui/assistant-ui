import { describe, expect, it } from "vitest";
import { buildContextNav } from "./contextNodes";
import { flattenNav } from "../nav";

describe("buildContextNav", () => {
  it("groups model and runtime slices", () => {
    const groups = buildContextNav({
      id: 1,
      state: {
        mcp: { servers: [] },
        tools: { search: ["SearchUI"] },
      },
      logs: [],
      modelContext: {
        system: "You are helpful.",
        tools: [{ name: "search", type: "function" }],
        config: { modelName: "gpt" },
      },
    });

    expect(groups.map((group) => group.label)).toEqual(["Model", "Runtime"]);
    const ids = flattenNav(groups).map((node) => node.id);
    expect(ids).toEqual([
      "ctx:system",
      "ctx:tool:search",
      "ctx:config",
      "ctx:mcp",
      "ctx:toolUIs",
    ]);
  });

  it("assigns unique navigation IDs to tools with the same display name", () => {
    const groups = buildContextNav({
      id: 1,
      state: {},
      logs: [],
      modelContext: {
        tools: [
          { name: "[Unserializable]" },
          { name: "[Unserializable]:2" },
          { name: "[Unserializable]" },
        ],
      },
    });

    expect(flattenNav(groups).map((node) => node.id)).toEqual([
      "ctx:tool:[Unserializable]",
      "ctx:tool:[Unserializable]:2",
      "ctx:tool:[Unserializable]:3",
    ]);
  });
});
