import { describe, it, expect } from "vitest";
import { performance } from "perf_hooks";
import { MastraMessageAccumulator } from "../MastraMessageAccumulator";
import { createMockMastraMessage, createMockStreamEvents } from "../testUtils";

describe("Mastra Performance Benchmarks", () => {
  it("processes 1000 message chunks within performance threshold", async () => {
    const accumulator = new MastraMessageAccumulator();
    const messages = Array.from({ length: 1000 }, (_, i) =>
      createMockMastraMessage({ id: `msg-${i}` }),
    );

    const start = performance.now();
    accumulator.addMessages(messages);
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(1000); // < 1 second
    console.log(`Processed 1000 messages in ${duration}ms`);
  });

  it("maintains memory usage under threshold during streaming", () => {
    // Force GC if available to get clean baseline
    if (global.gc) {
      global.gc();
    }

    const accumulator = new MastraMessageAccumulator();
    const initialMemory = process.memoryUsage().heapUsed;

    // Add many messages to simulate streaming
    for (let i = 0; i < 1000; i++) {
      const message = createMockMastraMessage({ id: `msg-${i}` });
      accumulator.addMessages([message]);
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 100MB to account for V8 overhead)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    console.log(
      `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
    );
  });

  it("handles message merging efficiently", () => {
    const accumulator = new MastraMessageAccumulator();
    const baseMessage = createMockMastraMessage({
      id: "msg-1",
      content: [{ type: "text", text: "Hello" }],
    });

    // Start with base message
    accumulator.addMessages([baseMessage]);

    // Simulate streaming updates to the same message
    const updates = Array.from({ length: 100 }, (_, i) =>
      createMockMastraMessage({
        id: "msg-1",
        content: [{ type: "text", text: `Hello ${i}` }],
      }),
    );

    const start = performance.now();
    updates.forEach((update) => accumulator.addMessages([update]));
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(100); // Should be very fast for same-message updates
    console.log(`Merged 100 updates in ${duration}ms`);

    // Should still only have one message
    expect(accumulator.getMessages()).toHaveLength(1);
  });

  it("creates mock events efficiently", () => {
    const start = performance.now();
    const events = createMockStreamEvents(
      "This is a test message that should be processed quickly",
      false,
    );
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(10); // Should be very fast
    expect(events.length).toBeGreaterThan(0);
    console.log(`Created ${events.length} mock events in ${duration}ms`);
  });

  it("handles tool call processing efficiently", () => {
    const accumulator = new MastraMessageAccumulator();

    // Create messages with tool calls
    const messagesWithTools = Array.from({ length: 100 }, (_, i) =>
      createMockMastraMessage({
        id: `msg-${i}`,
        content: [
          { type: "text", text: "Processing tool call" },
          {
            type: "tool_call",
            tool_call: {
              id: `tool-${i}`,
              name: "testTool",
              arguments: { input: `test input ${i}` },
            },
          },
        ],
      }),
    );

    const start = performance.now();
    accumulator.addMessages(messagesWithTools);
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(200); // Tool calls can be more expensive
    console.log(`Processed 100 tool call messages in ${duration}ms`);
  });

  it("measures cleanup performance", () => {
    type TestMessage = ReturnType<typeof createMockMastraMessage>;
    // Create accumulator with maxMessages set to 5000 to test cleanup of large set
    const accumulator = new MastraMessageAccumulator<TestMessage>({
      maxMessages: 5000,
      initialMessages: [],
      appendMessage: (
        existing: TestMessage | undefined,
        event: TestMessage,
      ): TestMessage => {
        if (!existing) return event;
        const existingContent = Array.isArray(existing.content)
          ? existing.content
          : [];
        const eventContent = Array.isArray(event.content) ? event.content : [];
        return {
          ...existing,
          content: [...existingContent, ...eventContent],
        };
      },
    });

    // Add many messages
    const messages = Array.from({ length: 5000 }, (_, i) =>
      createMockMastraMessage({ id: `msg-${i}` }),
    );
    accumulator.addMessages(messages);

    expect(accumulator.getMessages()).toHaveLength(5000);

    const start = performance.now();
    accumulator.clear();
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(10); // Cleanup should be very fast
    expect(accumulator.getMessages()).toHaveLength(0);
    console.log(`Cleaned up 5000 messages in ${duration}ms`);
  });
});
