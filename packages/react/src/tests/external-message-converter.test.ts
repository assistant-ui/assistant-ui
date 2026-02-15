import { describe, it, expect } from "vitest";
import { convertExternalMessages } from "../legacy-runtime/runtime-cores/external-store/external-message-converter";
import type { useExternalMessageConverter } from "../legacy-runtime/runtime-cores/external-store/external-message-converter";
import { isErrorMessageId } from "@assistant-ui/core/internal";

describe("convertExternalMessages", () => {
  describe("reasoning part merging", () => {
    it("should merge reasoning parts with the same parentId", () => {
      const messages = [
        {
          id: "msg1",
          role: "assistant" as const,
          content: [
            {
              type: "reasoning" as const,
              text: "First reasoning",
              parentId: "parent1",
            },
          ],
        },
        {
          id: "msg2",
          role: "assistant" as const,
          content: [
            {
              type: "reasoning" as const,
              text: "Second reasoning",
              parentId: "parent1",
            },
          ],
        },
      ];

      const callback: useExternalMessageConverter.Callback<
        (typeof messages)[number]
      > = (msg) => msg;

      const result = convertExternalMessages(messages, callback, false, {});

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe("assistant");

      const reasoningParts = result[0]!.content.filter(
        (p) => p.type === "reasoning",
      );
      expect(reasoningParts).toHaveLength(1);
      expect((reasoningParts[0] as any).text).toBe(
        "First reasoning\n\nSecond reasoning",
      );
      expect((reasoningParts[0] as any).parentId).toBe("parent1");
    });

    it("should keep reasoning parts without parentId separate", () => {
      const messages = [
        {
          id: "msg1",
          role: "assistant" as const,
          content: [{ type: "reasoning" as const, text: "First reasoning" }],
        },
        {
          id: "msg2",
          role: "assistant" as const,
          content: [{ type: "reasoning" as const, text: "Second reasoning" }],
        },
      ];

      const callback: useExternalMessageConverter.Callback<
        (typeof messages)[number]
      > = (msg) => msg;

      const result = convertExternalMessages(messages, callback, false, {});

      expect(result).toHaveLength(1);

      const reasoningParts = result[0]!.content.filter(
        (p) => p.type === "reasoning",
      );
      expect(reasoningParts).toHaveLength(2);
      expect((reasoningParts[0] as any).text).toBe("First reasoning");
      expect((reasoningParts[1] as any).text).toBe("Second reasoning");
    });

    it("should keep reasoning parts with different parentIds separate", () => {
      const messages = [
        {
          id: "msg1",
          role: "assistant" as const,
          content: [
            {
              type: "reasoning" as const,
              text: "Reasoning for parent1",
              parentId: "parent1",
            },
          ],
        },
        {
          id: "msg2",
          role: "assistant" as const,
          content: [
            {
              type: "reasoning" as const,
              text: "Reasoning for parent2",
              parentId: "parent2",
            },
          ],
        },
      ];

      const callback: useExternalMessageConverter.Callback<
        (typeof messages)[number]
      > = (msg) => msg;

      const result = convertExternalMessages(messages, callback, false, {});

      expect(result).toHaveLength(1);

      const reasoningParts = result[0]!.content.filter(
        (p) => p.type === "reasoning",
      );
      expect(reasoningParts).toHaveLength(2);
      expect((reasoningParts[0] as any).parentId).toBe("parent1");
      expect((reasoningParts[1] as any).parentId).toBe("parent2");
    });

    it("should still merge tool results with matching tool calls", () => {
      const messages = [
        {
          id: "msg1",
          role: "assistant" as const,
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "tc1",
              toolName: "search",
              args: { query: "test" },
              argsText: '{"query":"test"}',
            },
          ],
        },
        {
          role: "tool" as const,
          toolCallId: "tc1",
          result: { data: "result" },
        },
      ];

      const callback: useExternalMessageConverter.Callback<
        (typeof messages)[number]
      > = (msg) => msg;

      const result = convertExternalMessages(messages, callback, false, {});

      expect(result).toHaveLength(1);

      const toolCallParts = result[0]!.content.filter(
        (p) => p.type === "tool-call",
      );
      expect(toolCallParts).toHaveLength(1);
      expect((toolCallParts[0] as any).result).toEqual({ data: "result" });
    });

    it("should preserve component parts from assistant messages", () => {
      const messages = [
        {
          id: "msg1",
          role: "assistant" as const,
          content: [
            {
              type: "component" as const,
              name: "status-chip",
              props: { label: "Ready" },
            },
          ],
        },
      ];

      const callback: useExternalMessageConverter.Callback<
        (typeof messages)[number]
      > = (msg) => msg;

      const result = convertExternalMessages(messages, callback, false, {});

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe("assistant");
      expect(result[0]!.content).toHaveLength(1);
      expect(result[0]!.content[0]).toMatchObject({
        type: "component",
        name: "status-chip",
        props: { label: "Ready" },
      });
    });
  });

  describe("synthetic error message", () => {
    it("should create synthetic error message when error exists and no messages", () => {
      const messages: never[] = [];
      const callback: useExternalMessageConverter.Callback<never> = (msg) =>
        msg;

      const result = convertExternalMessages(messages, callback, false, {
        error: "API key is missing",
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe("assistant");
      expect(result[0]!.content).toHaveLength(0);
      expect(result[0]!.status).toEqual({
        type: "incomplete",
        reason: "error",
        error: "API key is missing",
      });
      expect(isErrorMessageId(result[0]!.id)).toBe(true);
    });

    it("should create synthetic error message when error exists and last message is user", () => {
      const messages = [
        {
          id: "user1",
          role: "user" as const,
          content: "Hello",
        },
      ];

      const callback: useExternalMessageConverter.Callback<
        (typeof messages)[number]
      > = (msg) => msg;

      const result = convertExternalMessages(messages, callback, false, {
        error: { message: "Invalid API key" },
      });

      expect(result).toHaveLength(2);
      expect(result[0]!.role).toBe("user");
      expect(result[1]!.role).toBe("assistant");
      expect(result[1]!.content).toHaveLength(0);
      expect(result[1]!.status).toEqual({
        type: "incomplete",
        reason: "error",
        error: { message: "Invalid API key" },
      });
      expect(isErrorMessageId(result[1]!.id)).toBe(true);
    });

    it("should not create synthetic error message when last message is assistant", () => {
      const messages = [
        {
          id: "user1",
          role: "user" as const,
          content: "Hello",
        },
        {
          id: "assistant1",
          role: "assistant" as const,
          content: "Hi there",
        },
      ];

      const callback: useExternalMessageConverter.Callback<
        (typeof messages)[number]
      > = (msg) => msg;

      const result = convertExternalMessages(messages, callback, false, {
        error: "Connection error",
      });

      expect(result).toHaveLength(2);
      expect(result[0]!.role).toBe("user");
      expect(result[1]!.role).toBe("assistant");
      expect(result[1]!.id).toBe("assistant1");
      expect(result[1]!.status).toMatchObject({
        type: "incomplete",
        reason: "error",
        error: "Connection error",
      });
      expect(isErrorMessageId(result[1]!.id)).toBe(false);
    });

    it("should not create synthetic message when no error", () => {
      const messages = [
        {
          id: "user1",
          role: "user" as const,
          content: "Hello",
        },
      ];

      const callback: useExternalMessageConverter.Callback<
        (typeof messages)[number]
      > = (msg) => msg;

      const result = convertExternalMessages(messages, callback, false, {});

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe("user");
    });
  });
});
