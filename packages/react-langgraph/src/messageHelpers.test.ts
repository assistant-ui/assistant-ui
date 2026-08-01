import { describe, expect, it } from "vitest";
import { getPendingToolCalls } from "./messageHelpers";

describe("getPendingToolCalls", () => {
  it("matches an empty backend result id to its synthesized tool call id", () => {
    expect(
      getPendingToolCalls([
        {
          id: "ai-1",
          type: "ai",
          content: "",
          tool_calls: [{ id: "", index: 0, name: "lookup", args: {} }],
        },
        {
          type: "tool",
          tool_call_id: "",
          content: "done",
        },
      ]),
    ).toEqual([]);
  });
});
