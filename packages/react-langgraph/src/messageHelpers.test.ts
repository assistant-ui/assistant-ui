import { describe, expect, it } from "vitest";
import { getPendingToolCalls } from "./messageHelpers";

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

  it("does not guess when an empty result id matches multiple pending calls", () => {
    const pending = getPendingToolCalls([
      {
        id: "ai-1",
        type: "ai",
        content: "",
        tool_calls: [{ id: "", index: 0, name: "first", args: {} }],
      },
      {
        id: "ai-2",
        type: "ai",
        content: "",
        tool_calls: [{ id: "", index: 0, name: "second", args: {} }],
      },
      { type: "tool", tool_call_id: "", content: "ambiguous" },
    ]);

    expect(pending).toHaveLength(2);
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
