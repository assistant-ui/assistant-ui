import { describe, it, expect } from "vitest";
import { convertExternalMessages } from "../legacy-runtime/runtime-cores/external-store/external-message-converter";
import type { useExternalMessageConverter } from "../legacy-runtime/runtime-cores/external-store/external-message-converter";

/**
 * Tests for the external message converter, specifically the joinExternalMessages logic.
 */
describe("convertExternalMessages", () => {
  describe("reasoning part merging", () => {
    /**
     * Tests that reasoning parts with the same parentId are merged together.
     * The text should be concatenated with a double newline separator.
     */
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

    /**
     * Tests that reasoning parts without parentId remain separate.
     */
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

    /**
     * Tests that reasoning parts with different parentIds remain separate.
     */
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

    /**
     * Tests that tool result merging still works correctly alongside reasoning merging.
     */
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
  });
});
