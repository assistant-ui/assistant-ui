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

  describe("video parts", () => {
    it("normalizes assistant video parts", () => {
      const message = fromThreadMessageLike(
        {
          role: "assistant",
          content: [
            {
              type: "video",
              url: "https://cdn.example.com/output.mp4",
              mimeType: "video/mp4",
              filename: "output.mp4",
              posterUrl: "https://cdn.example.com/poster.jpg",
              width: 1280,
              height: 720,
              durationSeconds: 4,
              providerMetadata: { model: "example" },
              parentId: "tool_1",
            },
          ],
        },
        "msg_1",
        { type: "complete", reason: "unknown" },
      );

      expect(message.content[0]).toEqual({
        type: "video",
        url: "https://cdn.example.com/output.mp4",
        mimeType: "video/mp4",
        filename: "output.mp4",
        posterUrl: "https://cdn.example.com/poster.jpg",
        width: 1280,
        height: 720,
        durationSeconds: 4,
        providerMetadata: { model: "example" },
        parentId: "tool_1",
      });
    });

    it("normalizes user video parts and video attachment content", () => {
      const message = fromThreadMessageLike(
        {
          role: "user",
          content: [
            {
              type: "video",
              url: "/api/videos/vid_123",
              mimeType: "video/mp4",
            },
          ],
          attachments: [
            {
              id: "att_1",
              type: "video",
              name: "output.mp4",
              contentType: "video/mp4",
              status: { type: "complete" },
              content: [
                {
                  type: "video",
                  url: "https://cdn.example.com/output.mp4",
                  mimeType: "video/mp4",
                  filename: "output.mp4",
                },
              ],
            },
          ],
        },
        "msg_1",
        { type: "complete", reason: "unknown" },
      );

      expect(message.content[0]).toMatchObject({
        type: "video",
        url: "/api/videos/vid_123",
      });
      if (message.role !== "user") throw new Error("Expected a user message");
      expect(message.attachments[0]?.content[0]).toMatchObject({
        type: "video",
        url: "https://cdn.example.com/output.mp4",
      });
    });
  });
});
