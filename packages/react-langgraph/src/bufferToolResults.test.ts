import { describe, it, expect } from "vitest";
import { bufferToolResult } from "./bufferToolResults";

type ToolMessage = { tool_call_id: string; content: string };

const msg = (id: string): ToolMessage => ({
  tool_call_id: id,
  content: `result-${id}`,
});

describe("bufferToolResult", () => {
  it("releases a single tool call immediately", () => {
    const buffer = new Map<string, ToolMessage>();
    const batch = bufferToolResult(buffer, [{ id: "a" }], msg("a"));
    expect(batch).toEqual([msg("a")]);
    expect(buffer.size).toBe(0);
  });

  it("buffers parallel tool calls until every one has a result", () => {
    const buffer = new Map<string, ToolMessage>();
    const pending = [{ id: "a" }, { id: "b" }];

    // First result of the pair: keep waiting.
    expect(bufferToolResult(buffer, pending, msg("a"))).toBeNull();
    expect(buffer.size).toBe(1);

    // Second result completes the turn: release both at once.
    const batch = bufferToolResult(buffer, pending, msg("b"));
    expect(batch).toEqual([msg("a"), msg("b")]);
    expect(buffer.size).toBe(0);
  });

  it("releases the batch in pending-tool-call order, not arrival order", () => {
    const buffer = new Map<string, ToolMessage>();
    const pending = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(bufferToolResult(buffer, pending, msg("c"))).toBeNull();
    expect(bufferToolResult(buffer, pending, msg("a"))).toBeNull();
    const batch = bufferToolResult(buffer, pending, msg("b"));

    expect(batch).toEqual([msg("a"), msg("b"), msg("c")]);
  });

  it("does not release while a sibling tool call is still outstanding", () => {
    const buffer = new Map<string, ToolMessage>();
    const pending = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(bufferToolResult(buffer, pending, msg("a"))).toBeNull();
    expect(bufferToolResult(buffer, pending, msg("b"))).toBeNull();
    expect(buffer.size).toBe(2);
  });

  it("releases a late or duplicate result on its own without wedging", () => {
    const buffer = new Map<string, ToolMessage>();
    // The resolved call is not among the turn's pending calls.
    const batch = bufferToolResult(buffer, [{ id: "other" }], msg("a"));
    expect(batch).toEqual([msg("a")]);
    expect(buffer.has("a")).toBe(false);
    // The unrelated pending call stays buffered-free; nothing leaks.
    expect(buffer.size).toBe(0);
  });

  it("supports two pending turns sharing a buffer without cross-talk", () => {
    const buffer = new Map<string, ToolMessage>();

    // Turn 1: single call resolves and is released.
    expect(bufferToolResult(buffer, [{ id: "a" }], msg("a"))).toEqual([
      msg("a"),
    ]);

    // Turn 2: a fresh parallel pair buffers and releases independently.
    const pending2 = [{ id: "b" }, { id: "c" }];
    expect(bufferToolResult(buffer, pending2, msg("b"))).toBeNull();
    expect(bufferToolResult(buffer, pending2, msg("c"))).toEqual([
      msg("b"),
      msg("c"),
    ]);
    expect(buffer.size).toBe(0);
  });
});
