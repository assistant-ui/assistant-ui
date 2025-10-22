import { describe, it, expect } from "vitest";
import { auiV0Encode, auiV0Decode } from "./auiV0";
import type { ThreadMessage } from "../../types";
import type { CloudMessage } from "assistant-cloud";

describe("auiV0 - Reasoning Duration Persistence", () => {
  describe("auiV0Encode", () => {
    it("should encode reasoning part with duration", () => {
      const message: ThreadMessage = {
        id: "msg-1",
        role: "assistant",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        content: [
          {
            type: "reasoning",
            text: "Analyzing the problem...",
            duration: 5,
          },
        ],
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      };

      const encoded = auiV0Encode(message);

      expect(encoded.role).toBe("assistant");
      expect(encoded.content).toHaveLength(1);
      expect(encoded.content[0]).toEqual({
        type: "reasoning",
        text: "Analyzing the problem...",
        duration: 5,
      });
    });

    it("should encode reasoning part without duration field when undefined", () => {
      const message: ThreadMessage = {
        id: "msg-1",
        role: "assistant",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        content: [
          {
            type: "reasoning",
            text: "No duration tracked",
          },
        ],
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      };

      const encoded = auiV0Encode(message);

      expect(encoded.content[0]).toEqual({
        type: "reasoning",
        text: "No duration tracked",
        // duration field should not be present
      });
      expect(encoded.content[0]).not.toHaveProperty("duration");
    });

    it("should encode multiple content parts including reasoning with duration", () => {
      const message: ThreadMessage = {
        id: "msg-1",
        role: "assistant",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        content: [
          {
            type: "text",
            text: "Let me think about this...",
          },
          {
            type: "reasoning",
            text: "Step 1: Analysis\nStep 2: Solution",
            duration: 8,
          },
          {
            type: "text",
            text: "Here's my answer: 42",
          },
        ],
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      };

      const encoded = auiV0Encode(message);

      expect(encoded.content).toHaveLength(3);
      expect(encoded.content[0]).toEqual({
        type: "text",
        text: "Let me think about this...",
      });
      expect(encoded.content[1]).toEqual({
        type: "reasoning",
        text: "Step 1: Analysis\nStep 2: Solution",
        duration: 8,
      });
      expect(encoded.content[2]).toEqual({
        type: "text",
        text: "Here's my answer: 42",
      });
    });

    it("should handle duration value of 0", () => {
      const message: ThreadMessage = {
        id: "msg-1",
        role: "assistant",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        content: [
          {
            type: "reasoning",
            text: "Instant thought",
            duration: 0,
          },
        ],
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      };

      const encoded = auiV0Encode(message);

      expect(encoded.content[0]).toEqual({
        type: "reasoning",
        text: "Instant thought",
        duration: 0,
      });
    });
  });

  describe("auiV0Decode", () => {
    it("should decode reasoning part with duration", () => {
      const cloudMessage: CloudMessage & { format: "aui/v0" } = {
        id: "msg-1",
        parent_id: null,
        created_at: new Date("2024-01-01T00:00:00Z"),
        format: "aui/v0",
        content: {
          role: "assistant",
          content: [
            {
              type: "reasoning",
              text: "Decoded reasoning",
              duration: 7,
            },
          ],
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        },
      };

      const { message } = auiV0Decode(cloudMessage);

      expect(message.id).toBe("msg-1");
      expect(message.role).toBe("assistant");
      expect(message.content).toHaveLength(1);
      expect(message.content[0]).toMatchObject({
        type: "reasoning",
        text: "Decoded reasoning",
        duration: 7,
      });
    });

    it("should decode reasoning part without duration", () => {
      const cloudMessage: CloudMessage & { format: "aui/v0" } = {
        id: "msg-1",
        parent_id: null,
        created_at: new Date("2024-01-01T00:00:00Z"),
        format: "aui/v0",
        content: {
          role: "assistant",
          content: [
            {
              type: "reasoning",
              text: "Old message without duration",
            },
          ],
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        },
      };

      const { message } = auiV0Decode(cloudMessage);

      expect(message.content[0]).toMatchObject({
        type: "reasoning",
        text: "Old message without duration",
      });
      // duration may or may not be present as undefined - that's okay
    });

    it("should preserve zero durations on decode", () => {
      const cloudMessage: CloudMessage & { format: "aui/v0" } = {
        id: "msg-3",
        parent_id: null,
        created_at: new Date("2024-01-01T00:00:00Z"),
        format: "aui/v0",
        content: {
          role: "assistant",
          content: [
            {
              type: "reasoning",
              text: "Instant",
              duration: 0,
            },
          ],
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        },
      };

      const { message } = auiV0Decode(cloudMessage);

      expect(message.content[0]).toMatchObject({
        type: "reasoning",
        duration: 0,
      });
    });

    it("should preserve parentId from cloud message", () => {
      const cloudMessage: CloudMessage & { format: "aui/v0" } = {
        id: "msg-2",
        parent_id: "msg-1",
        created_at: new Date("2024-01-01T00:00:00Z"),
        format: "aui/v0",
        content: {
          role: "assistant",
          content: [
            {
              type: "reasoning",
              text: "Response with parent",
              duration: 3,
            },
          ],
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        },
      };

      const result = auiV0Decode(cloudMessage);

      expect(result.parentId).toBe("msg-1");
      expect(result.message.id).toBe("msg-2");
    });
  });

  describe("round-trip encode/decode", () => {
    it("should preserve duration through full encode/decode cycle", () => {
      const originalMessage: ThreadMessage = {
        id: "msg-1",
        role: "assistant",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        content: [
          {
            type: "text",
            text: "Thinking...",
          },
          {
            type: "reasoning",
            text: "Deep analysis of the question",
            duration: 12,
          },
          {
            type: "text",
            text: "The answer is correct",
          },
        ],
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      };

      // Encode
      const encoded = auiV0Encode(originalMessage);

      // Simulate cloud storage
      const cloudMessage: CloudMessage & { format: "aui/v0" } = {
        id: originalMessage.id,
        parent_id: null,
        created_at: originalMessage.createdAt,
        format: "aui/v0",
        content: encoded,
      };

      // Decode
      const { message: decodedMessage } = auiV0Decode(cloudMessage);

      // Verify duration preserved
      expect(decodedMessage.content).toHaveLength(3);
      expect(decodedMessage.content[1]).toMatchObject({
        type: "reasoning",
        text: "Deep analysis of the question",
        duration: 12,
      });
    });

    it("should handle messages with multiple reasoning parts", () => {
      const originalMessage: ThreadMessage = {
        id: "msg-1",
        role: "assistant",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        content: [
          {
            type: "reasoning",
            text: "First reasoning step",
            duration: 5,
          },
          {
            type: "text",
            text: "Intermediate conclusion",
          },
          {
            type: "reasoning",
            text: "Second reasoning step",
            duration: 3,
          },
        ],
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      };

      const encoded = auiV0Encode(originalMessage);
      const cloudMessage: CloudMessage & { format: "aui/v0" } = {
        id: "msg-1",
        parent_id: null,
        created_at: originalMessage.createdAt,
        format: "aui/v0",
        content: encoded,
      };
      const { message: decoded } = auiV0Decode(cloudMessage);

      expect(decoded.content[0]).toMatchObject({
        type: "reasoning",
        duration: 5,
      });
      expect(decoded.content[2]).toMatchObject({
        type: "reasoning",
        duration: 3,
      });
    });
  });
});
