import { describe, expect, it } from "vitest";
import { mapToolCallToChecklistItem } from "../react/primitive-hooks/useToolActivityChecklist";

describe("mapToolCallToChecklistItem", () => {
  const makePart = (overrides: Record<string, unknown> = {}) =>
    ({
      type: "tool-call" as const,
      toolCallId: "tc1",
      toolName: "file_edit",
      args: {},
      argsText: "{}",
      ...overrides,
    }) as any;

  it("maps running status", () => {
    const item = mapToolCallToChecklistItem(
      makePart({ status: { type: "running" } }),
    );
    expect(item.id).toBe("tc1");
    expect(item.text).toBe("file_edit");
    expect(item.status).toBe("running");
  });

  it("maps complete status", () => {
    const item = mapToolCallToChecklistItem(
      makePart({ result: "done", status: { type: "complete" } }),
    );
    expect(item.status).toBe("complete");
  });

  it("maps complete + isError to error", () => {
    const item = mapToolCallToChecklistItem(
      makePart({ result: "fail", isError: true, status: { type: "complete" } }),
    );
    expect(item.status).toBe("error");
  });

  it("maps requires-action to running", () => {
    const item = mapToolCallToChecklistItem(
      makePart({ status: { type: "requires-action", reason: "interrupt" } }),
    );
    expect(item.status).toBe("running");
  });

  it("maps incomplete to error", () => {
    const item = mapToolCallToChecklistItem(
      makePart({ status: { type: "incomplete", reason: "cancelled" } }),
    );
    expect(item.status).toBe("error");
  });

  it("falls back: isError without status.type → error", () => {
    const item = mapToolCallToChecklistItem(
      makePart({ isError: true, result: "something failed" }),
    );
    expect(item.status).toBe("error");
  });

  it("falls back: result without status.type → complete", () => {
    const item = mapToolCallToChecklistItem(makePart({ result: "success" }));
    expect(item.status).toBe("complete");
  });

  it("uses formatToolName when provided", () => {
    const item = mapToolCallToChecklistItem(
      makePart({ status: { type: "running" } }),
      (name) => name.replace("_", " "),
    );
    expect(item.text).toBe("file edit");
  });

  it("extracts detail from argsText", () => {
    const item = mapToolCallToChecklistItem(
      makePart({
        argsText: '{"path": "foo.ts"}',
        status: { type: "running" },
      }),
    );
    expect(item.detail).toContain("path");
  });

  it("returns no detail for empty argsText", () => {
    const item = mapToolCallToChecklistItem(
      makePart({ argsText: "{}", status: { type: "running" } }),
    );
    expect(item.detail).toBeUndefined();
  });
});
