import { describe, it, expect } from "vitest";
import { aiSDKV5FormatAdapter } from "./aiSDKFormatAdapter";
import type { UIMessage } from "ai";

describe("aiSDKV5FormatAdapter.encode", () => {
  describe("step-start part filtering", () => {
    it("should filter out step-start parts", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          { type: "step-start" } as any,
          { type: "text", text: "Hello" },
          { type: "step-start" } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.parts).toHaveLength(1);
      expect(encoded.parts[0]).toEqual({ type: "text", text: "Hello" });
    });

    it("should filter out file parts", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "user",
        parts: [
          { type: "text", text: "Check this" },
          {
            type: "file",
            filename: "test.pdf",
            url: "blob://...",
            mediaType: "application/pdf",
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.parts).toHaveLength(1);
      expect(encoded.parts[0].type).toBe("text");
    });
  });

  describe("reasoning part merging by itemId", () => {
    it("should merge multiple reasoning parts with same itemId", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "First paragraph",
            state: "done",
            providerMetadata: {
              openai: { itemId: "rs_123" },
            },
          } as any,
          {
            type: "reasoning",
            text: "Second paragraph",
            state: "done",
            providerMetadata: {
              openai: { itemId: "rs_123" },
            },
          } as any,
          {
            type: "reasoning",
            text: "Third paragraph",
            state: "done",
            providerMetadata: {
              openai: { itemId: "rs_123" },
            },
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      // Should merge into single reasoning part
      expect(encoded.parts).toHaveLength(1);
      expect(encoded.parts[0].type).toBe("reasoning");
      expect(encoded.parts[0].text).toBe(
        "First paragraph\n\nSecond paragraph\n\nThird paragraph",
      );
    });

    it("should keep reasoning parts with different itemIds separate", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "First thought",
            state: "done",
            providerMetadata: {
              openai: { itemId: "rs_123" },
            },
          } as any,
          {
            type: "reasoning",
            text: "Second thought",
            state: "done",
            providerMetadata: {
              openai: { itemId: "rs_456" },
            },
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      // Should keep as separate parts
      expect(encoded.parts).toHaveLength(2);
      expect(encoded.parts[0].text).toBe("First thought");
      expect(encoded.parts[1].text).toBe("Second thought");
    });

    it("should keep reasoning parts without itemId as-is", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "Standalone thought",
            state: "done",
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.parts).toHaveLength(1);
      expect(encoded.parts[0].text).toBe("Standalone thought");
    });

    it("should preserve metadata from first part when merging", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "First",
            state: "done",
            providerMetadata: {
              openai: { itemId: "rs_123" },
              "assistant-ui": { duration: 5 },
            },
          } as any,
          {
            type: "reasoning",
            text: "Second",
            state: "done",
            providerMetadata: {
              openai: { itemId: "rs_123" },
            },
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.parts).toHaveLength(1);
      // Duration from first part should be preserved
      expect(encoded.parts[0].providerMetadata?.["assistant-ui"]).toEqual({
        duration: 5,
      });
    });
  });

  describe("providerMetadata sanitization", () => {
    it("should strip reasoningEncryptedContent from providerMetadata", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "Thinking...",
            state: "done",
            providerMetadata: {
              openai: {
                itemId: "rs_123",
                reasoningEncryptedContent: "gAAAAABo7IdLY6uSbfeI9vegE...",
              },
            },
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.parts[0].providerMetadata?.openai).toEqual({
        itemId: "rs_123",
      });
      expect(
        encoded.parts[0].providerMetadata?.openai?.reasoningEncryptedContent,
      ).toBeUndefined();
    });

    it("should strip encryptedContent from providerMetadata", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Hello",
            providerMetadata: {
              custom: {
                encryptedContent: "secret_data",
                safeField: "keep_this",
              },
            },
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.parts[0].providerMetadata?.custom).toEqual({
        safeField: "keep_this",
      });
    });

    it("should preserve safe metadata fields", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "Thinking...",
            state: "done",
            providerMetadata: {
              openai: {
                itemId: "rs_123",
                model: "o1-preview",
                reasoningEncryptedContent: "should_be_removed",
              },
              "assistant-ui": {
                duration: 5,
              },
            },
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      // Should keep itemId, model, and duration
      expect(encoded.parts[0].providerMetadata).toEqual({
        openai: {
          itemId: "rs_123",
          model: "o1-preview",
        },
        "assistant-ui": {
          duration: 5,
        },
      });
    });

    it("should handle parts without providerMetadata", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Hello",
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.parts[0]).toEqual({
        type: "text",
        text: "Hello",
      });
    });
  });

  describe("complex real-world scenarios", () => {
    it("should handle OpenAI o1 response with multiple reasoning paragraphs", () => {
      // Simulates actual OpenAI o1 response pattern
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          { type: "step-start" } as any, // Should be filtered
          {
            type: "reasoning",
            text: "**Evaluating the question**\n\nThe user is asking...",
            state: "done",
            providerMetadata: {
              openai: {
                itemId: "rs_080fb5bad9b8095c0168ec872980d081",
              },
              "assistant-ui": {
                duration: 35,
              },
            },
          } as any,
          {
            type: "reasoning",
            text: "**Analyzing options**\n\nConsider the following...",
            state: "done",
            providerMetadata: {
              openai: {
                itemId: "rs_080fb5bad9b8095c0168ec872980d081",
                reasoningEncryptedContent: "gAAAAABo7IdLY6uSbfeI9vegE...", // Should be stripped
              },
            },
          } as any,
          {
            type: "reasoning",
            text: "**Drawing conclusions**\n\nBased on the analysis...",
            state: "done",
            providerMetadata: {
              openai: {
                itemId: "rs_080fb5bad9b8095c0168ec872980d081",
                reasoningEncryptedContent: "gAAAAABo7IdLY6uSbfeI9vegF...",
              },
            },
          } as any,
          {
            type: "text",
            text: "The answer is...",
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      // Should have 2 parts: 1 merged reasoning + 1 text
      expect(encoded.parts).toHaveLength(2);

      // First part should be merged reasoning
      expect(encoded.parts[0].type).toBe("reasoning");
      expect(encoded.parts[0].text).toContain("Evaluating the question");
      expect(encoded.parts[0].text).toContain("Analyzing options");
      expect(encoded.parts[0].text).toContain("Drawing conclusions");

      // Duration should be preserved
      expect(encoded.parts[0].providerMetadata?.["assistant-ui"]).toEqual({
        duration: 35,
      });

      // itemId should be preserved
      expect(encoded.parts[0].providerMetadata?.openai?.itemId).toBe(
        "rs_080fb5bad9b8095c0168ec872980d081",
      );

      // Encrypted content should be stripped
      expect(
        encoded.parts[0].providerMetadata?.openai?.reasoningEncryptedContent,
      ).toBeUndefined();

      // Second part should be text
      expect(encoded.parts[1].type).toBe("text");
      expect(encoded.parts[1].text).toBe("The answer is...");
    });

    it("should handle mixed content with reasoning, text, and tool calls", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "First thought",
            state: "done",
            providerMetadata: {
              openai: { itemId: "rs_123" },
            },
          } as any,
          {
            type: "reasoning",
            text: "Second thought",
            state: "done",
            providerMetadata: {
              openai: { itemId: "rs_123" },
            },
          } as any,
          {
            type: "text",
            text: "Let me search for that",
          } as any,
          {
            type: "tool-search",
            toolCallId: "call_1",
            toolName: "search",
            state: "output-available",
            input: { query: "test" },
            output: { results: [] },
          } as any,
          {
            type: "text",
            text: "Here's what I found",
          } as any,
        ],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.parts).toHaveLength(4);
      expect(encoded.parts[0].type).toBe("reasoning");
      expect(encoded.parts[0].text).toBe("First thought\n\nSecond thought");
      expect(encoded.parts[1].type).toBe("text");
      expect(encoded.parts[2].type).toBe("tool-search");
      expect(encoded.parts[3].type).toBe("text");
    });
  });

  describe("edge cases", () => {
    it("should handle empty parts array", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.parts).toHaveLength(0);
    });

    it("should handle message with only step-start parts", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [{ type: "step-start" } as any, { type: "step-start" } as any],
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.parts).toHaveLength(0);
    });

    it("should preserve message properties other than parts", () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "assistant",
        parts: [{ type: "text", text: "Hello" } as any],
        annotations: ["test-annotation"] as any,
        data: { custom: "value" } as any,
      };

      const encoded = aiSDKV5FormatAdapter.encode({
        parentId: null,
        message,
      });

      expect(encoded.role).toBe("assistant");
      expect(encoded.annotations).toEqual(["test-annotation"]);
      expect(encoded.data).toEqual({ custom: "value" });
    });
  });
});

describe("aiSDKV5FormatAdapter.decode", () => {
  it("should decode stored message", () => {
    const stored = {
      id: "msg-1",
      parent_id: "msg-0",
      format: "ai-sdk/v5" as const,
      content: {
        role: "assistant" as const,
        parts: [{ type: "text", text: "Hello" }],
      },
    };

    const decoded = aiSDKV5FormatAdapter.decode(stored);

    expect(decoded.parentId).toBe("msg-0");
    expect(decoded.message.id).toBe("msg-1");
    expect(decoded.message.role).toBe("assistant");
    expect(decoded.message.parts).toEqual([{ type: "text", text: "Hello" }]);
  });
});

describe("aiSDKV5FormatAdapter.getId", () => {
  it("should return message id", () => {
    const message: UIMessage = {
      id: "msg-123",
      role: "user",
      parts: [],
    };

    expect(aiSDKV5FormatAdapter.getId(message)).toBe("msg-123");
  });
});
