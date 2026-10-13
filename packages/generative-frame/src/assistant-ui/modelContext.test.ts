// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
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

  it("restores the newest context recorded on the call, and a cleared one", () => {
    const entry = (toolCallId: string, context: unknown) => ({
      type: "action",
      payload: { type: "modelContext", toolCallId, context },
    });
    const log = {
      entries: [
        entry("a", { text: "first" }),
        entry("b", { text: "other" }),
        entry("a", { text: "second" }),
      ],
    };
    expect(savedContext(log, "a")).toEqual({ text: "second" });
    expect(
      savedContext({ entries: [...log.entries, entry("a", null)] }, "a"),
    ).toBeUndefined();
    expect(savedContext(undefined, "a")).toBeUndefined();
  });

  it("names the UI and caps the instruction", () => {
    expect(contextInstruction("t", { text: "x", data: [1] })).toBe(
      'The user\'s choices in the UI "t", as they stand now: x [1]',
    );
    const long = contextInstruction("t", { text: "y".repeat(5000) });
    expect(long).toHaveLength(4000);
    expect(long.endsWith("…")).toBe(true);
  });
});
