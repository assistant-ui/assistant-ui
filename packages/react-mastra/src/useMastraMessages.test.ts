import { describe, it, expect, beforeEach } from "vitest";
import { MastraMessageAccumulator } from "./MastraMessageAccumulator";
import {
  createMockMastraEvent,
  createMockMastraMessage,
  createMockToolCall,
} from "./testUtils";
import { MastraKnownEventTypes } from "./types";

describe("MastraMessageAccumulator", () => {
  let accumulator: MastraMessageAccumulator<any>;

  beforeEach(() => {
    accumulator = new MastraMessageAccumulator<any>();
  });

  it("should add messages with IDs", () => {
    const message = createMockMastraMessage({ id: "msg-1" });
    const result = accumulator.addMessages([message]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(message);
  });

  it("should generate IDs for messages without them", () => {
    const message = createMockMastraMessage({ id: undefined });
    const result = accumulator.addMessages([message]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBeDefined();
    expect(typeof result[0].id).toBe("string");
  });

  it("should merge messages with the same ID", () => {
    const baseMessage = createMockMastraMessage({
      id: "msg-1",
      content: [{ type: "text", text: "Hello" }],
    });

    const partialMessage = createMockMastraMessage({
      id: "msg-1",
      content: [{ type: "text", text: "Hello world" }],
    });

    accumulator.addMessages([baseMessage]);
    const result = accumulator.addMessages([partialMessage]);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual([{ type: "text", text: "Hello world" }]);
  });

  it("should handle multiple different messages", () => {
    const message1 = createMockMastraMessage({ id: "msg-1" });
    const message2 = createMockMastraMessage({ id: "msg-2" });
    const message3 = createMockMastraMessage({ id: "msg-3" });

    const result = accumulator.addMessages([message1, message2, message3]);

    expect(result).toHaveLength(3);
    expect(result.map((m) => m.id)).toEqual(["msg-1", "msg-2", "msg-3"]);
  });

  it("should handle tool call content", () => {
    const toolCall = createMockToolCall();
    const messageWithTool = createMockMastraMessage({
      id: "msg-1",
      content: [
        { type: "text", text: "I'll help you with that" },
        { type: "tool_call", tool_call: toolCall },
      ],
    });

    const result = accumulator.addMessages([messageWithTool]);

    expect(result).toHaveLength(1);
    expect(result[0].content).toHaveLength(2);
    expect(result[0].content[1]).toEqual({
      type: "tool_call",
      tool_call: toolCall,
    });
  });

  it("should cleanup properly", () => {
    const message1 = createMockMastraMessage({ id: "msg-1" });
    const message2 = createMockMastraMessage({ id: "msg-2" });

    accumulator.addMessages([message1, message2]);
    expect(accumulator.getMessages()).toHaveLength(2);

    accumulator.clear();
    expect(accumulator.getMessages()).toHaveLength(0);
  });

  it("should prevent memory leaks by limiting message count", () => {
    // Create accumulator with max limit
    const limitedAccumulator = new MastraMessageAccumulator({
      maxMessages: 1000, // Set a reasonable limit for testing
    });

    // Add many messages (simulating the max limit behavior)
    const messages = Array.from({ length: 1500 }, (_, i) =>
      createMockMastraMessage({ id: `msg-${i}` }),
    );

    limitedAccumulator.addMessages(messages);
    const result = limitedAccumulator.getMessages();
    const memoryUsage = limitedAccumulator.getMemoryUsage();

    // Should not grow indefinitely
    expect(result.length).toBeLessThanOrEqual(1000);
    expect(memoryUsage.count).toBeLessThanOrEqual(1000);
    expect(memoryUsage.utilization).toBeLessThanOrEqual(1);
  });
});

describe("Event Processing", () => {
  it("should process message partial events", () => {
    const partialEvent = createMockMastraEvent(
      MastraKnownEventTypes.MessagePartial,
      {
        id: "msg-1",
        type: "assistant",
        content: [{ type: "text", text: "Hello" }],
      },
    );

    const accumulator = new MastraMessageAccumulator<any>();
    const result = accumulator.addMessages([partialEvent.data]);

    expect(result).toHaveLength(1);
    expect(result[0].content[0].text).toBe("Hello");
  });

  it("should process message complete events", () => {
    const completeEvent = createMockMastraEvent(
      MastraKnownEventTypes.MessageComplete,
      {
        id: "msg-1",
        type: "assistant",
        content: [{ type: "text", text: "Hello world" }],
      },
    );

    const accumulator = new MastraMessageAccumulator<any>();
    const result = accumulator.addMessages([completeEvent.data]);

    expect(result).toHaveLength(1);
    expect(result[0].content[0].text).toBe("Hello world");
  });

  it("should process tool call events", () => {
    const toolCall = createMockToolCall();
    const toolCallEvent = createMockMastraEvent(
      MastraKnownEventTypes.ToolCall,
      toolCall,
    );

    // Test that tool call events are properly structured
    expect(toolCallEvent.data).toEqual(toolCall);
    expect(toolCallEvent.data.id).toBe("tool-call-test-id");
    expect(toolCallEvent.data.name).toBe("testTool");
  });

  it("should process error events", () => {
    const errorMessage = "Something went wrong";
    const errorEvent = createMockMastraEvent(
      MastraKnownEventTypes.Error,
      errorMessage,
    );

    expect(errorEvent.event).toBe("error");
    expect(errorEvent.data).toBe(errorMessage);
    expect(errorEvent.timestamp).toBeDefined();
  });

  it("should process metadata events", () => {
    const metadata = { tokenCount: 150, model: "gpt-4" };
    const metadataEvent = createMockMastraEvent(
      MastraKnownEventTypes.Metadata,
      metadata,
    );

    expect(metadataEvent.event).toBe("metadata");
    expect(metadataEvent.data).toEqual(metadata);
  });

  it("should process interrupt events", () => {
    const interruptData = {
      type: "human_input_required",
      message: "Please confirm this action",
    };
    const interruptEvent = createMockMastraEvent(
      MastraKnownEventTypes.Interrupt,
      interruptData,
    );

    expect(interruptEvent.event).toBe("interrupt");
    expect(interruptEvent.data).toEqual(interruptData);
  });
});
