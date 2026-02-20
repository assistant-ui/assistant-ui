import { describe, expect, it } from "vitest";
import { fromThreadMessageLike } from "../runtime/utils/thread-message-like";

const fallbackId = "test-id";
const fallbackStatus = { type: "complete" as const };

describe("fromThreadMessageLike", () => {
  describe("data-* prefixed types", () => {
    it("converts user message data-* part to data part", () => {
      const result = fromThreadMessageLike(
        {
          role: "user",
          content: [{ type: "data-workflow", data: { step: 1, name: "test" } }],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.role).toBe("user");
      expect(result.content).toEqual([
        { type: "data", name: "workflow", data: { step: 1, name: "test" } },
      ]);
    });

    it("converts assistant message data-* part to data part", () => {
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [{ type: "data-status", data: { progress: 50 } }],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.role).toBe("assistant");
      expect(result.content).toEqual([
        { type: "data", name: "status", data: { progress: 50 } },
      ]);
    });

    it("still supports explicit data format", () => {
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [{ type: "data", name: "workflow", data: { step: 1 } }],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.role).toBe("assistant");
      expect(result.content).toEqual([
        { type: "data", name: "workflow", data: { step: 1 } },
      ]);
    });

    it("throws on unknown non-data assistant part types", () => {
      expect(() =>
        fromThreadMessageLike(
          {
            role: "assistant",
            content: [{ type: "unknown-type" } as any],
          },
          fallbackId,
          fallbackStatus,
        ),
      ).toThrow("Unsupported assistant message part type: unknown-type");
    });

    it("converts data-* parts in attachment content", () => {
      const result = fromThreadMessageLike(
        {
          role: "user",
          content: [{ type: "text", text: "hello" }],
          attachments: [
            {
              id: "att-1",
              type: "data-workflow",
              name: "My Workflow",
              status: { type: "complete" },
              content: [{ type: "data-workflow", data: { id: "wf-1" } }],
            },
          ],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.role).toBe("user");
      const userMsg = result as any;
      expect(userMsg.attachments[0].content).toEqual([
        { type: "data", name: "workflow", data: { id: "wf-1" } },
      ]);
      expect(userMsg.attachments[0].type).toBe("data-workflow");
    });

    it("throws on unknown non-data user part types", () => {
      expect(() =>
        fromThreadMessageLike(
          {
            role: "user",
            content: [{ type: "tool-call", toolName: "test" } as any],
          },
          fallbackId,
          fallbackStatus,
        ),
      ).toThrow("Unsupported user message part type: tool-call");
    });
  });
});
