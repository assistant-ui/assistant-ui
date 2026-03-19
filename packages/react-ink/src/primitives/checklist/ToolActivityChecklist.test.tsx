import { afterEach, describe, expect, it } from "vitest";
import { cleanup } from "ink-testing-library";
import { mapToolCallToChecklistItem } from "./ToolActivityChecklist";

afterEach(() => {
  cleanup();
});

describe("mapToolCallToChecklistItem", () => {
  it("maps running tool call to running status", () => {
    const item = mapToolCallToChecklistItem({
      type: "tool-call",
      toolCallId: "tc1",
      toolName: "file_edit",
      args: {},
      argsText: '{"path": "foo.ts"}',
      status: { type: "running" },
    } as any);
    expect(item.id).toBe("tc1");
    expect(item.text).toBe("file_edit");
    expect(item.status).toBe("running");
  });

  it("maps complete tool call to complete status", () => {
    const item = mapToolCallToChecklistItem({
      type: "tool-call",
      toolCallId: "tc2",
      toolName: "search",
      args: {},
      argsText: "{}",
      result: "found 3 matches",
      status: { type: "complete" },
    } as any);
    expect(item.status).toBe("complete");
  });

  it("maps complete + isError to error status", () => {
    const item = mapToolCallToChecklistItem({
      type: "tool-call",
      toolCallId: "tc3",
      toolName: "run_tests",
      args: {},
      argsText: "{}",
      result: "failed",
      isError: true,
      status: { type: "complete" },
    } as any);
    expect(item.status).toBe("error");
  });

  it("maps requires-action to running status", () => {
    const item = mapToolCallToChecklistItem({
      type: "tool-call",
      toolCallId: "tc4",
      toolName: "dangerous_op",
      args: {},
      argsText: "{}",
      interrupt: { type: "human", payload: {} },
      status: { type: "requires-action", reason: "interrupt" },
    } as any);
    expect(item.status).toBe("running");
  });

  it("maps incomplete to error status", () => {
    const item = mapToolCallToChecklistItem({
      type: "tool-call",
      toolCallId: "tc5",
      toolName: "timed_out",
      args: {},
      argsText: "{}",
      status: { type: "incomplete", reason: "cancelled" },
    } as any);
    expect(item.status).toBe("error");
  });

  it("maps isError without status.type to error (fallback)", () => {
    const item = mapToolCallToChecklistItem({
      type: "tool-call",
      toolCallId: "tc5b",
      toolName: "broken",
      args: {},
      argsText: "{}",
      isError: true,
      result: "something failed",
    } as any);
    expect(item.status).toBe("error");
  });

  it("maps result without status.type to complete (fallback)", () => {
    const item = mapToolCallToChecklistItem({
      type: "tool-call",
      toolCallId: "tc5c",
      toolName: "done",
      args: {},
      argsText: "{}",
      result: "success",
    } as any);
    expect(item.status).toBe("complete");
  });

  it("maps tool call with no status and no result to pending", () => {
    const item = mapToolCallToChecklistItem({
      type: "tool-call",
      toolCallId: "tc7",
      toolName: "queued_task",
      args: {},
      argsText: "{}",
    } as any);
    expect(item.status).toBe("pending");
  });

  it("uses formatToolName when provided", () => {
    const item = mapToolCallToChecklistItem(
      {
        type: "tool-call",
        toolCallId: "tc6",
        toolName: "file_edit",
        args: {},
        argsText: "{}",
        status: { type: "running" },
      } as any,
      (name) => name.replace("_", " "),
    );
    expect(item.text).toBe("file edit");
  });
});
