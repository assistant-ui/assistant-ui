import { describe, expect, it } from "vitest";
import { getPendingToolCalls } from "./messageHelpers";

describe("getPendingToolCalls", () => {
  it("scopes synthesized ids to distinct id-less tool calls", () => {
    const pending = getPendingToolCalls(
      ["first", "second"].map((name) => ({
        type: "ai" as const,
        content: "",
        tool_calls: [{ id: "", index: 0, name, args: {} }],
      })),
    );

    expect(pending).toHaveLength(2);
    expect(new Set(pending.map((toolCall) => toolCall.id)).size).toBe(2);
  });

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
