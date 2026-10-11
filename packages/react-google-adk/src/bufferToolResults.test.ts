import { describe, expect, it } from "vitest";
import { takeBufferedToolResults } from "./bufferToolResults";

describe("takeBufferedToolResults", () => {
  it("waits for every pending call and releases results in call order", () => {
    const buffer = new Map([["c2", { tool_call_id: "c2" }]]);
    expect(takeBufferedToolResults(buffer, ["c1", "c2"])).toBeNull();
    buffer.set("c1", { tool_call_id: "c1" });
    expect(takeBufferedToolResults(buffer, ["c1", "c2"])).toEqual([
      { tool_call_id: "c1" },
      { tool_call_id: "c2" },
    ]);
    expect(buffer.size).toBe(0);
  });

  it("can release a partial batch for a new user turn", () => {
    const buffer = new Map([["c2", { tool_call_id: "c2" }]]);
    expect(takeBufferedToolResults(buffer, ["c1", "c2"], true)).toEqual([
      { tool_call_id: "c2" },
    ]);
    expect(buffer.size).toBe(0);
  });
});
