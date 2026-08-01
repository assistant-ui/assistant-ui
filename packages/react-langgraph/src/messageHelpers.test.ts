import { describe, expect, it } from "vitest";
import { getLangChainToolCallIds, getPendingToolCalls } from "./messageHelpers";

describe("getPendingToolCalls", () => {
  it("keeps synthesized ids stable across rebuilt tool call objects", () => {
    const getId = () =>
      getPendingToolCalls([
        {
          type: "ai",
          content: "",
          tool_calls: [{ id: "", index: 0, name: "lookup", args: {} }],
        },
      ])[0]!.id;

    expect(getId()).toBe(getId());
  });

  it("does not rewrite a synthesized id when a sibling call arrives", () => {
    const synthesizedId = getLangChainToolCallIds("ai-1", [
      { id: "", index: 0, name: "lookup", args: {} },
    ])[0]!;
    const rebuiltIds = getLangChainToolCallIds("ai-1", [
      { id: "", index: 0, name: "lookup", args: {} },
      { id: synthesizedId, index: 1, name: "calendar", args: {} },
    ]);

    expect(rebuiltIds[0]).toBe(synthesizedId);
  });

  it("does not match a non-empty unknown result to a synthesized call", () => {
    const pending = getPendingToolCalls([
      {
        id: "ai-1",
        type: "ai",
        content: "",
        tool_calls: [{ id: "", index: 0, name: "lookup", args: {} }],
      },
      { type: "tool", tool_call_id: "unrelated", content: "done" },
    ]);

    expect(pending).toHaveLength(1);
  });

  it("uses aliases to reconcile a result stored under a synthesized id", () => {
    const pending = getPendingToolCalls(
      [
        {
          id: "ai-1",
          type: "ai",
          content: "",
          tool_calls: [{ id: "tc-real", name: "lookup", args: {} }],
        },
        {
          type: "tool",
          tool_call_id: "lc-toolcall-ai-1-0",
          content: "done",
        },
      ],
      new Map([["lc-toolcall-ai-1-0", "tc-real"]]),
    );

    expect(pending).toEqual([]);
  });
});
