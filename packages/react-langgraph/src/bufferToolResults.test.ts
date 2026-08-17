import { describe, it, expect } from "vitest";
import { bufferToolResult } from "./bufferToolResults";

type ToolMessage = { tool_call_id: string; content: string };

const msg = (id: string): ToolMessage => ({
  tool_call_id: id,
  content: `result-${id}`,
});

describe("bufferToolResult", () => {
  it("releases a single tool call immediately", () => {
    const buffers = new Map<string, Map<string, ToolMessage>>();
    const batch = bufferToolResult(buffers, "turn-1", [{ id: "a" }], msg("a"));
    expect(batch).toEqual([msg("a")]);
    expect(buffers.size).toBe(0);
  });

  it("buffers parallel tool calls until every one has a result", () => {
    const buffers = new Map<string, Map<string, ToolMessage>>();
    const pending = [{ id: "a" }, { id: "b" }];

    // First result of the pair: keep waiting.
    expect(bufferToolResult(buffers, "turn-1", pending, msg("a"))).toBeNull();
    expect(buffers.get("turn-1")?.size).toBe(1);

    // Second result completes the turn: release both at once.
    const batch = bufferToolResult(buffers, "turn-1", pending, msg("b"));
    expect(batch).toEqual([msg("a"), msg("b")]);
    expect(buffers.size).toBe(0);
  });

  it("releases the batch in pending-tool-call order, not arrival order", () => {
    const buffers = new Map<string, Map<string, ToolMessage>>();
    const pending = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(bufferToolResult(buffers, "turn-1", pending, msg("c"))).toBeNull();
    expect(bufferToolResult(buffers, "turn-1", pending, msg("a"))).toBeNull();
    const batch = bufferToolResult(buffers, "turn-1", pending, msg("b"));

    expect(batch).toEqual([msg("a"), msg("b"), msg("c")]);
  });

  it("does not release while a sibling tool call is still outstanding", () => {
    const buffers = new Map<string, Map<string, ToolMessage>>();
    const pending = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(bufferToolResult(buffers, "turn-1", pending, msg("a"))).toBeNull();
    expect(bufferToolResult(buffers, "turn-1", pending, msg("b"))).toBeNull();
    expect(buffers.get("turn-1")?.size).toBe(2);
  });

  it("releases a late or duplicate result on its own without wedging", () => {
    const buffers = new Map<string, Map<string, ToolMessage>>();
    // The resolved call is not among the turn's pending calls.
    const batch = bufferToolResult(
      buffers,
      "turn-1",
      [{ id: "other" }],
      msg("a"),
    );
    expect(batch).toEqual([msg("a")]);
    expect(buffers.has("turn-1")).toBe(false);
    // The unrelated pending call stays buffered-free; nothing leaks.
    expect(buffers.size).toBe(0);
  });

  it("keeps simultaneous pending groups independent", () => {
    const buffers = new Map<string, Map<string, ToolMessage>>();
    const pending1 = [{ id: "a" }, { id: "b" }];
    const pending2 = [{ id: "c" }, { id: "d" }];

    expect(bufferToolResult(buffers, "turn-1", pending1, msg("a"))).toBeNull();
    expect(bufferToolResult(buffers, "turn-2", pending2, msg("c"))).toBeNull();

    expect(bufferToolResult(buffers, "turn-1", pending1, msg("b"))).toEqual([
      msg("a"),
      msg("b"),
    ]);
    expect(bufferToolResult(buffers, "turn-2", pending2, msg("d"))).toEqual([
      msg("c"),
      msg("d"),
    ]);
    expect(buffers.size).toBe(0);
  });
});
