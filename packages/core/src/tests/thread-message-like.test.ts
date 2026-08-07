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

    it("keeps a reasoning part with a summary and no text", () => {
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [
            {
              type: "reasoning",
              text: "",
              unstable_summary: "Searching the codebase",
            },
          ],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([
        {
          type: "reasoning",
          text: "",
          unstable_summary: "Searching the codebase",
        },
      ]);
    });

    it("drops a reasoning part with neither text nor a summary to show", () => {
      // the transport layers round-trip an empty summary faithfully; this is
      // the display normalizer, so it drops a part with nothing to render for
      // the same reason it drops whitespace-only text.
      const message = fromThreadMessageLike(
        {
          role: "assistant",
          content: [
            { type: "reasoning", text: "", unstable_summary: "" },
            { type: "reasoning", text: "  ", unstable_summary: "   " },
          ],
        },
        "m1",
        { type: "complete", reason: "unknown" },
      );

      expect(message.content).toEqual([]);
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

    it("keeps an image part with an uppercase-scheme data URL", () => {
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [{ type: "image", image: "DATA:IMAGE/PNG;base64,AAAA" }],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([
        { type: "image", image: "DATA:IMAGE/PNG;base64,AAAA" },
      ]);
    });

    it.each([
      "data:image/avif;base64,AAAA",
      "data:image/bmp;base64,AAAA",
      "data:image/heic;base64,AAAA",
      "data:image/heif;base64,AAAA",
      "data:image/tiff;base64,AAAA",
    ])("keeps an image part with a %s data URL", (image) => {
      const result = fromThreadMessageLike(
        { role: "assistant", content: [{ type: "image", image }] },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([{ type: "image", image }]);
    });

    it("keeps an image part with a parameterized data URL", () => {
      const image = "data:image/png;charset=utf-8;base64,AAAA";
      const result = fromThreadMessageLike(
        { role: "assistant", content: [{ type: "image", image }] },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([{ type: "image", image }]);
    });

    it("drops an image part with a non-image data URL", () => {
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [{ type: "image", image: "data:text/plain;base64,AAAA" }],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([]);
    });

    it("drops an image part with a non-base64 data URL", () => {
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [{ type: "image", image: "data:image/png,rawpayload" }],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([]);
    });

    it("drops an image part with a non-URL string", () => {
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [{ type: "image", image: "not-an-image" }],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.content).toEqual([]);
    });
  });

  describe("providerMetadata passthrough", () => {
    it("keeps providerMetadata on text, reasoning, and tool-call parts", () => {
      const providerMetadata = { acme: { agentName: "researcher" } };
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [
            { type: "text", text: "hi", providerMetadata },
            { type: "reasoning", text: "thinking", providerMetadata },
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
        type: "reasoning",
        text: "thinking",
        providerMetadata,
      });
      expect(result.content[2]).toMatchObject({
        type: "tool-call",
        toolCallId: "tc-1",
        providerMetadata,
      });
    });
  });

  describe("metadata.isOptimistic", () => {
    it("preserves isOptimistic on user messages", () => {
      const result = fromThreadMessageLike(
        {
          role: "user",
          content: [{ type: "text", text: "hello" }],
          metadata: { isOptimistic: true },
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.metadata.isOptimistic).toBe(true);
    });

    it("preserves isOptimistic on assistant messages", () => {
      const result = fromThreadMessageLike(
        {
          role: "assistant",
          content: [{ type: "text", text: "hello" }],
          metadata: { isOptimistic: true },
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.metadata.isOptimistic).toBe(true);
    });

    it("omits isOptimistic when false", () => {
      const result = fromThreadMessageLike(
        {
          role: "user",
          content: [{ type: "text", text: "hello" }],
          metadata: { isOptimistic: false },
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.metadata).not.toHaveProperty("isOptimistic");
    });

    it("omits isOptimistic when not set", () => {
      const result = fromThreadMessageLike(
        {
          role: "user",
          content: [{ type: "text", text: "hello" }],
        },
        fallbackId,
        fallbackStatus,
      );

      expect(result.metadata).not.toHaveProperty("isOptimistic");
    });
  });
});
