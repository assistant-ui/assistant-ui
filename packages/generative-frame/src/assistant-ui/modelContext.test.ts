// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  boundContext,
  contextInstruction,
  frameContext,
  savedContext,
  toSharedContext,
} from "./modelContext";

describe("shared model context", () => {
  it("keeps text and data, and clears when there is neither", () => {
    expect(toSharedContext("  Picked  ", { id: 1 })).toEqual({
      text: "Picked",
      data: { id: 1 },
    });
    expect(toSharedContext(" ", null)).toBeUndefined();
    expect(toSharedContext(undefined, undefined)).toBeUndefined();
  });

  it("reads MCP Apps params", () => {
    expect(
      frameContext({
        content: [
          { type: "text", text: "a" },
          { type: "image", data: "x" },
          { type: "text", text: "b" },
        ],
        structuredContent: { n: 2 },
      }),
    ).toEqual({ text: "a\nb", data: { n: 2 } });
    expect(frameContext("text")).toBeUndefined();
    expect(frameContext({ content: [] })).toBeUndefined();
  });

  it("restores the context of the call's newest snapshot", () => {
    const entry = (toolCallId: string, context?: unknown) => ({
      type: "action",
      payload: {
        type: "setState",
        toolCallId,
        writes: [],
        ...(context === undefined ? {} : { context }),
      },
    });
    const log = {
      entries: [
        entry("a", { text: "first" }),
        entry("b", { text: "other" }),
        entry("a", { text: "second" }),
      ],
    };
    expect(savedContext(log, "a", "setState")).toEqual({ text: "second" });
    expect(savedContext(log, "a", "widgetState")).toBeUndefined();
    expect(
      savedContext({ entries: [...log.entries, entry("a")] }, "a", "setState"),
    ).toBeUndefined();
    expect(savedContext(undefined, "a", "setState")).toBeUndefined();
  });

  it("bounds a context that would not fit in a record or a prompt", () => {
    const small = { text: "x", data: [1] };
    expect(boundContext(small)).toBe(small);
    const large = boundContext({ text: "y", data: "z".repeat(5000) });
    expect(Object.keys(large)).toEqual(["text"]);
    expect(large.text).toHaveLength(4000);
    expect(large.text!.endsWith("…")).toBe(true);
  });

  it("names the UI in the instruction", () => {
    expect(contextInstruction("t", { text: "x", data: [1] })).toBe(
      'The user\'s choices in the UI "t", as they stand now: x [1]',
    );
  });
});
