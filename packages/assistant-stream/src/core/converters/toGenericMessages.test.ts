import { describe, expect, it } from "vitest";
import { toGenericMessages } from "./toGenericMessages";

describe("toGenericMessages", () => {
  describe("system messages", () => {
    it("converts text content", () => {
      const result = toGenericMessages([
        {
          role: "system",
          content: [{ type: "text", text: "You are a helpful assistant." }],
        },
      ]);

      expect(result).toEqual([
        { role: "system", content: "You are a helpful assistant." },
      ]);
    });

    it("handles empty text", () => {
      const result = toGenericMessages([
        {
          role: "system",
          content: [{ type: "text", text: "" }],
        },
      ]);

      expect(result).toEqual([]);
    });

    it("handles missing text property", () => {
      const result = toGenericMessages([
        {
          role: "system",
          content: [{ type: "text" }],
        },
      ]);

      expect(result).toEqual([]);
    });

    it("uses first text part when multiple exist", () => {
      const result = toGenericMessages([
        {
          role: "system",
          content: [
            { type: "text", text: "First" },
            { type: "text", text: "Second" },
          ],
        },
      ]);

      expect(result).toEqual([{ role: "system", content: "First" }]);
    });
  });

  describe("user messages", () => {
    it("converts text parts", () => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [{ type: "text", text: "Hello!" }],
        },
      ]);

      expect(result).toEqual([
        { role: "user", content: [{ type: "text", text: "Hello!" }] },
      ]);
    });

    it("converts image parts with media type inference", () => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [{ type: "image", image: "https://example.com/photo.jpg" }],
        },
      ]);

      expect(result).toEqual([
        {
          role: "user",
          content: [
            {
              type: "file",
              data: new URL("https://example.com/photo.jpg"),
              mediaType: "image/jpeg",
            },
          ],
        },
      ]);
    });

    it("converts file parts", () => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [
            {
              type: "file",
              data: "https://example.com/doc.pdf",
              mimeType: "application/pdf",
            },
          ],
        },
      ]);

      expect(result).toEqual([
        {
          role: "user",
          content: [
            {
              type: "file",
              data: new URL("https://example.com/doc.pdf"),
              mediaType: "application/pdf",
            },
          ],
        },
      ]);
    });

    it("handles attachments", () => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [{ type: "text", text: "See attached" }],
          attachments: [
            {
              content: [
                {
                  type: "file",
                  data: "https://example.com/file.txt",
                  mimeType: "text/plain",
                },
              ],
            },
          ],
        },
      ]);

      expect(result).toEqual([
        {
          role: "user",
          content: [
            { type: "text", text: "See attached" },
            {
              type: "file",
              data: new URL("https://example.com/file.txt"),
              mediaType: "text/plain",
            },
          ],
        },
      ]);
    });

    it("filters invalid parts", () => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [
            { type: "text", text: "Valid" },
            { type: "image" }, // missing image property
            { type: "file", data: "some-data" }, // missing mimeType
            { type: "unknown" },
          ],
        },
      ]);

      expect(result).toEqual([
        { role: "user", content: [{ type: "text", text: "Valid" }] },
      ]);
    });

    it("handles data URL as URL object", () => {
      const dataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const result = toGenericMessages([
        {
          role: "user",
          content: [{ type: "image", image: dataUrl }],
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe("user");
      const content = (result[0] as { content: unknown[] }).content;
      expect(content[0]).toMatchObject({
        type: "file",
        mediaType: "image/png",
      });
      expect((content[0] as { data: unknown }).data).toBeInstanceOf(URL);
    });

    it("handles relative/invalid URL as string", () => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [
            {
              type: "file",
              data: "/relative/path/file.txt",
              mimeType: "text/plain",
            },
          ],
        },
      ]);

      expect(result).toEqual([
        {
          role: "user",
          content: [
            {
              type: "file",
              data: "/relative/path/file.txt",
              mediaType: "text/plain",
            },
          ],
        },
      ]);
    });

    it("produces empty result when all parts are invalid", () => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [{ type: "unknown" }],
        },
      ]);

      expect(result).toEqual([]);
    });
  });

  describe("assistant messages", () => {
    it("converts text parts", () => {
      const result = toGenericMessages([
        {
          role: "assistant",
          content: [{ type: "text", text: "Hello!" }],
        },
      ]);

      expect(result).toEqual([
        { role: "assistant", content: [{ type: "text", text: "Hello!" }] },
      ]);
    });

    it("converts tool calls without results", () => {
      const result = toGenericMessages([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "get_weather",
              args: { city: "London" },
            },
          ],
        },
      ]);

      expect(result).toEqual([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "get_weather",
              args: { city: "London" },
            },
          ],
        },
      ]);
    });

    it("converts tool calls with results (creates tool message)", () => {
      const result = toGenericMessages([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "get_weather",
              args: { city: "London" },
              result: { temperature: 20, unit: "celsius" },
            },
          ],
        },
      ]);

      expect(result).toEqual([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "get_weather",
              args: { city: "London" },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call_123",
              toolName: "get_weather",
              result: { temperature: 20, unit: "celsius" },
            },
          ],
        },
      ]);
    });

    it("includes isError in tool result when present", () => {
      const result = toGenericMessages([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "get_weather",
              args: { city: "London" },
              result: "Error: City not found",
              isError: true,
            },
          ],
        },
      ]);

      expect(result).toEqual([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "get_weather",
              args: { city: "London" },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call_123",
              toolName: "get_weather",
              result: "Error: City not found",
              isError: true,
            },
          ],
        },
      ]);
    });

    it("handles text-tool interleaving (flush on text boundary)", () => {
      const result = toGenericMessages([
        {
          role: "assistant",
          content: [
            { type: "text", text: "Let me check the weather." },
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "get_weather",
              args: { city: "London" },
              result: { temp: 20 },
            },
            { type: "text", text: "The weather is nice." },
          ],
        },
      ]);

      // The flush happens BEFORE adding text when there are pending tool results
      // So first assistant message contains both initial text and tool call
      expect(result).toEqual([
        {
          role: "assistant",
          content: [
            { type: "text", text: "Let me check the weather." },
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "get_weather",
              args: { city: "London" },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call_1",
              toolName: "get_weather",
              result: { temp: 20 },
            },
          ],
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "The weather is nice." }],
        },
      ]);
    });

    it("handles missing toolCallId", () => {
      const result = toGenericMessages([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolName: "get_weather",
              args: { city: "London" },
            },
          ],
        },
      ]);

      // Tool call should be skipped due to missing toolCallId
      expect(result).toEqual([]);
    });

    it("handles missing toolName", () => {
      const result = toGenericMessages([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              args: { city: "London" },
            },
          ],
        },
      ]);

      // Tool call should be skipped due to missing toolName
      expect(result).toEqual([]);
    });

    it("defaults args to empty object when missing", () => {
      const result = toGenericMessages([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "no_args_tool",
            },
          ],
        },
      ]);

      expect(result).toEqual([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "no_args_tool",
              args: {},
            },
          ],
        },
      ]);
    });

    it("handles multiple tool calls with mixed results", () => {
      const result = toGenericMessages([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "tool_a",
              args: {},
              result: "result_a",
            },
            {
              type: "tool-call",
              toolCallId: "call_2",
              toolName: "tool_b",
              args: {},
              // no result
            },
            {
              type: "tool-call",
              toolCallId: "call_3",
              toolName: "tool_c",
              args: {},
              result: "result_c",
            },
          ],
        },
      ]);

      expect(result).toEqual([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "tool_a",
              args: {},
            },
            {
              type: "tool-call",
              toolCallId: "call_2",
              toolName: "tool_b",
              args: {},
            },
            {
              type: "tool-call",
              toolCallId: "call_3",
              toolName: "tool_c",
              args: {},
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call_1",
              toolName: "tool_a",
              result: "result_a",
            },
            {
              type: "tool-result",
              toolCallId: "call_3",
              toolName: "tool_c",
              result: "result_c",
            },
          ],
        },
      ]);
    });
  });

  describe("inferImageMediaType", () => {
    const testMediaType = (url: string, expectedType: string) => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [{ type: "image", image: url }],
        },
      ]);
      const content = (result[0] as { content: { mediaType: string }[] })
        .content;
      expect(content[0]!.mediaType).toBe(expectedType);
    };

    it("handles jpg extension", () => {
      testMediaType("https://example.com/photo.jpg", "image/jpeg");
    });

    it("handles jpeg extension", () => {
      testMediaType("https://example.com/photo.jpeg", "image/jpeg");
    });

    it("handles png extension", () => {
      testMediaType("https://example.com/photo.png", "image/png");
    });

    it("handles gif extension", () => {
      testMediaType("https://example.com/photo.gif", "image/gif");
    });

    it("handles webp extension", () => {
      testMediaType("https://example.com/photo.webp", "image/webp");
    });

    it("handles svg extension", () => {
      testMediaType("https://example.com/icon.svg", "image/svg+xml");
    });

    it("handles avif extension", () => {
      testMediaType("https://example.com/photo.avif", "image/avif");
    });

    it("handles bmp extension", () => {
      testMediaType("https://example.com/photo.bmp", "image/bmp");
    });

    it("handles ico extension", () => {
      testMediaType("https://example.com/favicon.ico", "image/x-icon");
    });

    it("handles tiff extension", () => {
      testMediaType("https://example.com/photo.tiff", "image/tiff");
    });

    it("handles tif extension", () => {
      testMediaType("https://example.com/photo.tif", "image/tiff");
    });

    it("defaults to image/png for unknown extension", () => {
      testMediaType("https://example.com/photo.unknown", "image/png");
    });

    it("defaults to image/png for no extension", () => {
      testMediaType("https://example.com/photo", "image/png");
    });

    it("handles query params in URL", () => {
      testMediaType(
        "https://example.com/photo.jpg?size=large&quality=high",
        "image/jpeg",
      );
    });

    it("handles uppercase extensions", () => {
      testMediaType("https://example.com/photo.JPG", "image/jpeg");
    });
  });

  describe("toUrlOrString", () => {
    it("converts valid URL to URL object", () => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [{ type: "image", image: "https://example.com/photo.png" }],
        },
      ]);
      const content = (result[0] as { content: { data: unknown }[] }).content;
      expect(content[0]!.data).toBeInstanceOf(URL);
      expect((content[0]!.data as URL).href).toBe(
        "https://example.com/photo.png",
      );
    });

    it("converts data URL to URL object", () => {
      const dataUrl = "data:image/png;base64,abc123";
      const result = toGenericMessages([
        {
          role: "user",
          content: [{ type: "image", image: dataUrl }],
        },
      ]);
      const content = (result[0] as { content: { data: unknown }[] }).content;
      expect(content[0]!.data).toBeInstanceOf(URL);
    });

    it("keeps relative path as string", () => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [
            { type: "file", data: "/path/to/file.txt", mimeType: "text/plain" },
          ],
        },
      ]);
      const content = (result[0] as { content: { data: unknown }[] }).content;
      expect(content[0]!.data).toBe("/path/to/file.txt");
    });

    it("keeps invalid URL as string", () => {
      const result = toGenericMessages([
        {
          role: "user",
          content: [
            { type: "file", data: "not a valid url", mimeType: "text/plain" },
          ],
        },
      ]);
      const content = (result[0] as { content: { data: unknown }[] }).content;
      expect(content[0]!.data).toBe("not a valid url");
    });
  });

  describe("multiple messages", () => {
    it("converts a full conversation", () => {
      const result = toGenericMessages([
        {
          role: "system",
          content: [{ type: "text", text: "You are helpful." }],
        },
        {
          role: "user",
          content: [{ type: "text", text: "What is 2+2?" }],
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "2+2 equals 4." }],
        },
        {
          role: "user",
          content: [{ type: "text", text: "Thanks!" }],
        },
      ]);

      expect(result).toEqual([
        { role: "system", content: "You are helpful." },
        { role: "user", content: [{ type: "text", text: "What is 2+2?" }] },
        {
          role: "assistant",
          content: [{ type: "text", text: "2+2 equals 4." }],
        },
        { role: "user", content: [{ type: "text", text: "Thanks!" }] },
      ]);
    });

    it("handles empty messages array", () => {
      const result = toGenericMessages([]);
      expect(result).toEqual([]);
    });
  });
});
