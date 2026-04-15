import { describe, it, expect } from "vitest";
import { toJSON } from "../share/export-json";
import type { ThreadMessage } from "../types/message";

const user = (text: string): ThreadMessage =>
  ({
    id: "u-1",
    role: "user",
    createdAt: new Date("2026-03-25T10:00:00Z"),
    content: [{ type: "text", text }],
    attachments: [],
    metadata: { custom: {} },
  }) as ThreadMessage;

const assistant = (text: string): ThreadMessage =>
  ({
    id: "a-1",
    role: "assistant",
    createdAt: new Date("2026-03-25T10:00:01Z"),
    content: [{ type: "text", text }],
    status: { type: "complete", reason: "stop" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as ThreadMessage;

describe("toJSON", () => {
  it("returns valid JSON string", () => {
    const result = toJSON([user("Hello"), assistant("Hi")]);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("returns pretty-printed JSON when requested", () => {
    const result = toJSON([user("Hello")], { pretty: true });
    expect(result).toContain("\n");
  });

  it("returns compact JSON by default", () => {
    const result = toJSON([user("Hello")]);
    expect(result).not.toContain("\n");
  });

  it("serializes messages (Date → string)", () => {
    const result = JSON.parse(toJSON([user("Hello")]));
    expect(result[0].createdAt).toBe("2026-03-25T10:00:00.000Z");
  });

  it("handles empty array", () => {
    expect(toJSON([])).toBe("[]");
  });
});
