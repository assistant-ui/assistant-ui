import { describe, expect, it } from "vitest";
import { fromThreadMessageLike } from "../runtime/utils/thread-message-like";

const fallbackId = "test-id";
const fallbackStatus = {
  type: "complete" as const,
  reason: "stop" as const,
};

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

  describe("reasoning and image robustness", () => {
    it("drops a reasoning part whose text is undefined", () => {
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [
            { type: "reasoning", text: undefined as unknown as string },
          ],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([]);
    });

    it("drops a whitespace-only text part", () => {
      const result = fromThreadMessageLike(
        { role: "assistant", content: [{ type: "text", text: "   " }] },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([]);
    });

    it("keeps a reasoning part with real text", () => {
      const result = fromThreadMessageLike(
        { role: "assistant", content: [{ type: "reasoning", text: "hi" }] },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([{ type: "reasoning", text: "hi" }]);
    });

    it("drops an assistant image part whose image is undefined", () => {
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [{ type: "image", image: undefined as unknown as string }],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([]);
    });
  });

  describe("providerMetadata passthrough", () => {
    it("keeps providerMetadata on text and tool-call parts", () => {
      const providerMetadata = { acme: { agentName: "researcher" } };
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [
            { type: "text", text: "hi", providerMetadata },
            {
              type: "tool-call",
              toolCallId: "tc-1",
              toolName: "search",
              args: { query: "hi" },
              providerMetadata,
            },
          ],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content[0]).toMatchObject({
        type: "text",
        text: "hi",
        providerMetadata,
      });
      expect(result.content[1]).toMatchObject({
        type: "tool-call",
        toolCallId: "tc-1",
        providerMetadata,
      });
    });
  });
});
