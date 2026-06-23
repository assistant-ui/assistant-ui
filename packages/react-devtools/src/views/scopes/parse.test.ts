import { describe, expect, it } from "vitest";
import { parseScopes } from "./parse";

describe("parseScopes", () => {
  it("parses scopes and sorts root first, then by name", () => {
    const out = parseScopes([
      {
        name: "thread",
        source: "threads",
        query: { type: "main" },
        methods: ["getState", "append"],
      },
      { name: "threads", source: "root", query: {}, methods: ["getState"] },
    ]);

    expect(out.map((s) => s.name)).toEqual(["threads", "thread"]);
    expect(out[0]!.source).toBe("root");
    expect(out[1]!.query).toEqual({ type: "main" });
    expect(out[1]!.methods).toEqual(["getState", "append"]);
  });

  it("filters non-string methods and defaults a missing source to null", () => {
    const out = parseScopes([{ name: "x", methods: ["a", 1, null, "b"] }]);
    expect(out[0]!.methods).toEqual(["a", "b"]);
    expect(out[0]!.source).toBeNull();
  });

  it("drops entries without a name and returns [] for non-arrays", () => {
    expect(parseScopes([{ source: "root" }, 5, null])).toEqual([]);
    expect(parseScopes(undefined)).toEqual([]);
    expect(parseScopes(null)).toEqual([]);
    expect(parseScopes(42)).toEqual([]);
    expect(parseScopes({})).toEqual([]);
  });
});
