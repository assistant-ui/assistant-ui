import { describe, it, expect } from "vitest";
import { MastraMessageConverter } from "./convertMastraMessages";
import { createMockMastraMessage, createMockToolCall } from "./testUtils";
import { useExternalMessageConverter } from "@assistant-ui/react";

// Helper function to convert messages for testing
function getConvertedMessages(
  message: any,
): useExternalMessageConverter.Message[] {
  const result = MastraMessageConverter.toThreadMessages([message]);
  return Array.isArray(result) ? result : [result];
}

// Helper function to get the first message from array with non-null assertion
function getFirstMessage(
  messages: useExternalMessageConverter.Message[],
): useExternalMessageConverter.Message {
  return messages[0]!;
}

// Helper function to check if a message is a ThreadMessageLike
function isThreadMessageLike(
  message: useExternalMessageConverter.Message,
): message is Exclude<useExternalMessageConverter.Message, { role: "tool" }> {
  return message.role !== "tool";
}

describe("MastraMessageConverter", () => {
  it("should convert basic text messages", () => {
    const mastraMessage = createMockMastraMessage({
      type: "assistant",
      content: [{ type: "text", text: "Hello world" }],
    });

    const messages = getConvertedMessages(mastraMessage);
    const firstMessage = getFirstMessage(messages);

    expect(messages).toHaveLength(1);
    expect(firstMessage.role).toBe("assistant");
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.content).toHaveLength(1);
      expect(firstMessage.content[0]).toMatchObject({
        type: "text",
        text: "Hello world",
      });
    }
  });

  it("should convert user messages", () => {
    const mastraMessage = createMockMastraMessage({
      type: "human",
      content: [{ type: "text", text: "User input" }],
    });

    const messages = getConvertedMessages(mastraMessage);
    const firstMessage = getFirstMessage(messages);

    expect(messages).toHaveLength(1);
    expect(firstMessage.role).toBe("user");
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.content).toHaveLength(1);
      expect(firstMessage.content[0]).toMatchObject({
        type: "text",
        text: "User input",
      });
    }
  });

  it("should convert system messages", () => {
    const mastraMessage = createMockMastraMessage({
      type: "system",
      content: [{ type: "text", text: "System instruction" }],
    });

    const messages = getConvertedMessages(mastraMessage);
    const firstMessage = getFirstMessage(messages);

    expect(messages).toHaveLength(1);
    expect(firstMessage.role).toBe("system");
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.content).toHaveLength(1);
      expect(firstMessage.content[0]).toMatchObject({
        type: "text",
        text: "System instruction",
      });
    }
  });

  it("should convert messages with tool calls", () => {
    const toolCall = createMockToolCall();
    const mastraMessage = createMockMastraMessage({
      type: "assistant",
      content: [
        { type: "text", text: "I'll help you with that" },
        { type: "tool_call", tool_call: toolCall },
      ],
    });

    const messages = getConvertedMessages(mastraMessage);
    const firstMessage = getFirstMessage(messages);

    expect(messages).toHaveLength(1);
    expect(firstMessage.role).toBe("assistant");
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.content).toHaveLength(2);
      expect(firstMessage.content[0]).toMatchObject({
        type: "text",
        text: "I'll help you with that",
      });
      expect(firstMessage.content[1]).toMatchObject({
        type: "tool-call",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        args: toolCall.arguments,
      });
    }
  });

  it("should convert messages with reasoning content", () => {
    const mastraMessage = createMockMastraMessage({
      type: "assistant",
      content: [
        {
          type: "reasoning",
          reasoning: "Let me think about this step by step",
        },
        { type: "text", text: "The answer is 42" },
      ],
    });

    const messages = getConvertedMessages(mastraMessage);
    const firstMessage = getFirstMessage(messages);

    expect(messages).toHaveLength(1);
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.content).toHaveLength(2);
      expect(firstMessage.content[0]).toMatchObject({
        type: "reasoning",
        text: "Let me think about this step by step",
      });
      expect(firstMessage.content[1]).toMatchObject({
        type: "text",
        text: "The answer is 42",
      });
    }
  });

  it("should handle messages without content", () => {
    const mastraMessage = createMockMastraMessage({
      type: "assistant",
      content: [],
    });

    const messages = getConvertedMessages(mastraMessage);
    const firstMessage = getFirstMessage(messages);

    expect(messages).toHaveLength(1);
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.content).toEqual([]);
    }
  });

  it("should handle messages with null content", () => {
    const mastraMessage = createMockMastraMessage({
      type: "assistant",
      content: null as any,
    });

    const messages = getConvertedMessages(mastraMessage);
    const firstMessage = getFirstMessage(messages);

    expect(messages).toHaveLength(1);
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.content).toEqual([]);
    }
  });

  it("should preserve message metadata", () => {
    const mastraMessage = createMockMastraMessage({
      type: "assistant",
      content: [{ type: "text", text: "Hello" }],
      timestamp: "2023-01-01T00:00:00.000Z",
    });

    const messages = getConvertedMessages(mastraMessage);
    const firstMessage = getFirstMessage(messages);

    expect(messages).toHaveLength(1);
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.createdAt).toEqual(
        new Date("2023-01-01T00:00:00.000Z"),
      );
    }
  });

  it("should generate default timestamp if not provided", () => {
    const mastraMessage = createMockMastraMessage({
      type: "assistant",
      content: [{ type: "text", text: "Hello" }],
      // timestamp intentionally omitted to test default behavior
    });

    const messages = getConvertedMessages(mastraMessage);
    const firstMessage = getFirstMessage(messages);

    expect(messages).toHaveLength(1);
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.createdAt).toBeInstanceOf(Date);
    }
  });

  it("should convert tool result messages", () => {
    // First create an assistant message with the tool call
    const assistantMessage = createMockMastraMessage({
      type: "assistant",
      content: [
        {
          type: "tool_call",
          tool_call: {
            id: "tool-call-test-id",
            name: "testTool",
            arguments: { input: "test" },
          },
        },
      ],
    });

    // Then create the tool result message
    const toolResultMessage = createMockMastraMessage({
      type: "tool",
      content: [
        {
          type: "tool_result",
          tool_result: {
            success: true,
            tool_call_id: "tool-call-test-id",
            result: "The tool executed successfully",
          },
        },
      ],
    });

    // Convert both messages together so the tool call exists
    const messages = MastraMessageConverter.toThreadMessages([
      assistantMessage,
      toolResultMessage,
    ]);

    expect(messages).toHaveLength(1);
    const firstMessage = messages[0]!;
    expect(firstMessage.role).toBe("assistant");

    // The tool result should be merged into the assistant message's tool call
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.content).toHaveLength(1);
      const toolCall = firstMessage.content[0];
      expect(toolCall).toMatchObject({
        type: "tool-call",
        toolCallId: "tool-call-test-id",
        result: "The tool executed successfully",
      });
    }
  });

  it("should handle mixed content types", () => {
    const mastraMessage = createMockMastraMessage({
      type: "assistant",
      content: [
        { type: "reasoning", reasoning: "I need to use a tool" },
        { type: "tool_call", tool_call: createMockToolCall() },
        { type: "text", text: "I've called the tool for you" },
      ],
    });

    const messages = getConvertedMessages(mastraMessage);
    const firstMessage = getFirstMessage(messages);

    expect(messages).toHaveLength(1);
    if (isThreadMessageLike(firstMessage)) {
      expect(firstMessage.content).toHaveLength(3);
      const content = firstMessage.content;
      if (Array.isArray(content)) {
        expect(content[0]).toHaveProperty("type", "reasoning");
        expect(content[1]).toHaveProperty("type", "tool-call");
        expect(content[2]).toHaveProperty("type", "text");
      }
    }
  });
});
