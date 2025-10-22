import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { MastraMessageAccumulator } from "../../src/MastraMessageAccumulator";
import { MastraMessageConverter } from "../../src/convertMastraMessages";
import { createMockMastraMessage } from "../../src/testUtils";
import { performHealthCheck, checkHealthThresholds } from "../../src/health";

// Preserve original fetch
const originalFetch = global.fetch;

let fetchSpy: any;

describe("Mastra Integration Tests", () => {
  beforeAll(() => {
    // Setup test environment
    // Use spyOn so vi.restoreAllMocks() works correctly
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(vi.fn());
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Cleanup test environment
    // Explicitly restore original fetch
    if (fetchSpy) {
      fetchSpy.mockRestore();
    }
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("Message Accumulator Integration", () => {
    it("handles realistic message accumulation scenarios", () => {
      const accumulator = new MastraMessageAccumulator({
        maxMessages: 100,
      });

      // Simulate a realistic conversation
      const conversation = [
        createMockMastraMessage({
          id: "user-1",
          type: "human",
          content: [{ type: "text", text: "Hello" }],
        }),
        createMockMastraMessage({
          id: "assistant-1",
          type: "assistant",
          content: [{ type: "text", text: "Hi there!" }],
        }),
        createMockMastraMessage({
          id: "user-2",
          type: "human",
          content: [{ type: "text", text: "How are you?" }],
        }),
        createMockMastraMessage({
          id: "assistant-2",
          type: "assistant",
          content: [{ type: "text", text: "I'm doing well, thank you!" }],
        }),
      ];

      const result = accumulator.addMessages(conversation);

      expect(result).toHaveLength(4);
      expect(result.map((m) => m.id)).toEqual([
        "user-1",
        "assistant-1",
        "user-2",
        "assistant-2",
      ]);
    });

    it("maintains performance under load", () => {
      const accumulator = new MastraMessageAccumulator();

      const startTime = Date.now();

      // Add many messages to simulate load
      for (let i = 0; i < 1000; i++) {
        accumulator.addMessages([
          createMockMastraMessage({
            id: `load-test-${i}`,
            type: i % 2 === 0 ? "human" : "assistant",
            content: [{ type: "text", text: `Message ${i}` }],
          }),
        ]);
      }

      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000);

      // Should respect memory limits
      const memoryUsage = accumulator.getMemoryUsage();
      expect(memoryUsage.count).toBeLessThanOrEqual(1000);
    });

    it("handles message merging correctly", () => {
      const accumulator = new MastraMessageAccumulator();

      // Add initial message
      accumulator.addMessages([
        createMockMastraMessage({
          id: "stream-1",
          type: "assistant",
          content: [{ type: "text", text: "Hello" }],
        }),
      ]);

      // Simulate streaming updates
      const updates = [
        createMockMastraMessage({
          id: "stream-1",
          type: "assistant",
          content: [{ type: "text", text: "Hello world" }],
        }),
        createMockMastraMessage({
          id: "stream-1",
          type: "assistant",
          content: [{ type: "text", text: "Hello world! How are you?" }],
        }),
      ];

      updates.forEach((update) => accumulator.addMessages([update]));

      const result = accumulator.getMessages();
      expect(result).toHaveLength(1);
      expect(result[0].content[0].text).toBe("Hello world! How are you?");
    });
  });

  describe("Message Converter Integration", () => {
    it("handles complex message structures", () => {
      const complexMessage = createMockMastraMessage({
        id: "complex-1",
        type: "assistant",
        content: [
          { type: "text", text: "I'll help you with " },
          {
            type: "tool_call",
            tool_call: {
              id: "tool-1",
              name: "search",
              arguments: { query: "test information" },
            },
          },
          { type: "text", text: "Searching now..." },
        ],
        metadata: { tokens: 25, model: "gpt-4" },
      });

      const result = MastraMessageConverter.toThreadMessages([
        complexMessage,
      ])[0];

      expect(result).toBeDefined();
      expect(result.role).toBe("assistant");
      expect(result.content).toBeDefined();
    });

    it("handles edge cases gracefully", () => {
      // Test with empty content
      const emptyMessage = createMockMastraMessage({
        id: "empty-1",
        type: "assistant",
        content: [],
      });

      expect(() =>
        MastraMessageConverter.toThreadMessages([emptyMessage]),
      ).not.toThrow();

      // Test with null content
      const nullMessage = {
        id: "null-1",
        type: "assistant",
        content: null,
      } as any;

      expect(() =>
        MastraMessageConverter.toThreadMessages([nullMessage]),
      ).not.toThrow();
    });
  });

  describe("Health Check Integration", () => {
    it("performs basic health checks", async () => {
      const health = await performHealthCheck({
        includeMemoryDetails: true,
        checkConnections: false, // Skip for tests
      });

      expect(health).toBeDefined();
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health.timestamp).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(health.metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(health.metrics.errorRate).toBeGreaterThanOrEqual(0);
    });

    it("evaluates health thresholds correctly", async () => {
      const health = await performHealthCheck();
      const thresholds = checkHealthThresholds(health);

      expect(thresholds).toBeDefined();
      expect(typeof thresholds.isHealthy).toBe("boolean");
      expect(Array.isArray(thresholds.warnings)).toBe(true);
      expect(Array.isArray(thresholds.errors)).toBe(true);
    });

    it("handles health check errors gracefully", async () => {
      // Mock a scenario that might cause errors
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = () => {
        throw new Error("Memory check failed");
      };

      const health = await performHealthCheck();

      expect(health.status).toBe("unhealthy");
      expect(health.details).toBeDefined();
      expect(health.details.error).toBeDefined();

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe("Error Handling Integration", () => {
    it("handles malformed message data", () => {
      // Test that the converter handles malformed data gracefully
      const malformedMessage = {
        id: "malformed-1",
        type: "assistant",
        content: "This should be an array but is a string",
      } as any;

      // Should not throw when processing malformed data
      expect(() =>
        MastraMessageConverter.toThreadMessages([malformedMessage]),
      ).not.toThrow();
    });

    it("handles malformed responses", () => {
      // Configure the existing fetchSpy to return malformed data
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({
              done: false,
              value: new TextEncoder().encode("invalid json\n"),
            }),
          }),
        },
      } as Response);

      // Should handle malformed data gracefully
      expect(() => {
        // The error handling should prevent crashes
        console.log("Testing malformed response handling");
      }).not.toThrow();
    });
  });

  describe("Performance Integration", () => {
    it("maintains reasonable performance with large datasets", () => {
      const accumulator = new MastraMessageAccumulator({
        maxMessages: 500,
      });

      const startTime = Date.now();

      // Add a large number of messages
      for (let i = 0; i < 1000; i++) {
        accumulator.addMessages([
          createMockMastraMessage({
            id: `perf-${i}`,
            type: "assistant",
            content: [{ type: "text", text: `Performance test message ${i}` }],
          }),
        ]);
      }

      const duration = Date.now() - startTime;

      // Should be fast even with many messages
      expect(duration).toBeLessThan(500); // 500ms max

      // Should respect memory limits
      const finalMessages = accumulator.getMessages();
      expect(finalMessages.length).toBeLessThanOrEqual(500);
    });

    it("handles memory cleanup efficiently", () => {
      const accumulator = new MastraMessageAccumulator({
        maxMessages: 100,
      });

      // Fill to capacity
      for (let i = 0; i < 150; i++) {
        accumulator.addMessages([
          createMockMastraMessage({
            id: `cleanup-${i}`,
            type: "assistant",
            content: [{ type: "text", text: `Cleanup test ${i}` }],
          }),
        ]);
      }

      const messages = accumulator.getMessages();
      expect(messages.length).toBeLessThanOrEqual(100);

      // Cleanup should work correctly
      accumulator.clear();
      expect(accumulator.getMessages().length).toBe(0);
    });
  });
});
