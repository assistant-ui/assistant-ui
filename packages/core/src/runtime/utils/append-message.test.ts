import { describe, expect, it, vi } from "vitest";
import type { AppendMessage, ThreadMessage } from "../../types/message";
import { toAppendMessage } from "./append-message";

describe("toAppendMessage", () => {
  const messages = [{ id: "tail" }] as ThreadMessage[];

  it("uses the current tail for an omitted parent and creates a timestamp", () => {
    vi.useFakeTimers();
    try {
      const now = new Date("2026-01-02T03:04:05.000Z");
      vi.setSystemTime(now);
      const result = toAppendMessage(messages, "hello");
      expect(result).toMatchObject({
        parentId: "tail",
        sourceId: null,
        role: "user",
        content: [{ type: "text", text: "hello" }],
        attachments: [],
        metadata: { custom: {} },
        runConfig: {},
      });
      expect(result.createdAt).toEqual(now);
      expect(result.createdAt).not.toBe(now);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps an explicit root parent and supplied values by identity", () => {
    const createdAt = new Date("2026-04-05T06:07:08.000Z");
    const content = [{ type: "text" as const, text: "branch" }];
    const metadata = { custom: { marker: "original" } };
    const attachments: AppendMessage["attachments"] = [];
    const runConfig = { custom: { modelName: "sample" } };
    const result = toAppendMessage(messages, {
      parentId: null,
      sourceId: "source",
      role: "assistant",
      content,
      attachments,
      metadata,
      createdAt,
      runConfig,
      startRun: false,
    });
    expect(result.parentId).toBeNull();
    expect(result.sourceId).toBe("source");
    expect(result.role).toBe("assistant");
    expect(result.content).toBe(content);
    expect(result.attachments).toBe(attachments);
    expect(result.metadata).toBe(metadata);
    expect(result.createdAt).toBe(createdAt);
    expect(result.runConfig).toBe(runConfig);
    expect(result.startRun).toBe(false);
  });

  it("uses the current tail for an object without a parent", () => {
    expect(
      toAppendMessage(messages, { content: [], parentId: undefined }).parentId,
    ).toBe("tail");
  });

  it("selects a root parent when the thread is empty", () => {
    expect(
      toAppendMessage([], { content: [], parentId: undefined }).parentId,
    ).toBeNull();
  });
});
