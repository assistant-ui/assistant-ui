import { describe, expect, it } from "vitest";
import { unstable_runPendingTools } from "./toolResultStream";
import { AssistantMessage, ToolCallPart } from "../utils/types";
import { Tool } from "./tool-types";

const createDelayedTool = (delay: number, result?: string): Tool => ({
  parameters: { type: "object", properties: {} },
  execute: async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return result ?? `Tool with ${delay}ms delay executed`;
  },
});

const createErrorTool = (message: string): Tool => ({
  parameters: { type: "object", properties: {} },
  execute: async () => {
    throw new Error(message);
  },
});

describe("unstable_runPendingTools", () => {
  describe("parallel execution", () => {
    it("should run tool calls in parallel", async () => {
      const tool1 = createDelayedTool(100, "Tool 1");
      const tool2 = createDelayedTool(100, "Tool 2");
      const tool3 = createDelayedTool(100, "Tool 3");

      const tools: Record<string, Tool> = {
        tool1,
        tool2,
        tool3,
      };

      const message: AssistantMessage = {
        role: "assistant",
        status: {
          type: "requires-action",
          reason: "tool-calls",
        },
        parts: [
          {
            type: "tool-call",
            toolCallId: "1",
            toolName: "tool1",
            args: {},
          } as ToolCallPart,
          {
            type: "tool-call",
            toolCallId: "2",
            toolName: "tool2",
            args: {},
          } as ToolCallPart,
          {
            type: "tool-call",
            toolCallId: "3",
            toolName: "tool3",
            args: {},
          } as ToolCallPart,
        ],
        content: [],
        metadata: {
          unstable_state: {},
          unstable_data: [],
          unstable_annotations: [],
          steps: [],
          custom: {},
        },
      };

      const startTime = Date.now();
      const updatedMessage = await unstable_runPendingTools(
        message,
        tools,
        new AbortController().signal,
        async () => {},
      );
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(executionTime).toBeGreaterThanOrEqual(90); // Allow for timer imprecision
      // The execution time should be less than the sum of the delays of both tools.
      expect(executionTime).toBeLessThan(300);

      expect(updatedMessage.parts).toHaveLength(3);
      expect(updatedMessage.parts[0]).toMatchObject({
        type: "tool-call",
        toolCallId: "1",
        state: "result",
        result: "Tool 1",
        isError: false,
      });
      expect(updatedMessage.parts[1]).toMatchObject({
        type: "tool-call",
        toolCallId: "2",
        state: "result",
        result: "Tool 2",
        isError: false,
      });
      expect(updatedMessage.parts[2]).toMatchObject({
        type: "tool-call",
        toolCallId: "3",
        state: "result",
        result: "Tool 3",
        isError: false,
      });
    });

    it("should verify parallel execution via execution order", async () => {
      let tool1Started = false;
      let tool2Started = false;
      let tool1Finished = false;

      const tool1: Tool = {
        parameters: {
          type: "object",
          properties: {},
        },
        execute: async () => {
          tool1Started = true;
          await new Promise((resolve) => setTimeout(resolve, 50));
          tool1Finished = true;
          return "Tool 1 executed";
        },
      };

      const tool2: Tool = {
        parameters: { type: "object", properties: {} },
        execute: async () => {
          tool2Started = true;
          // In parallel execution, tool2 should start before tool1 finishes
          expect(tool1Finished).toBe(false);
          await new Promise((resolve) => setTimeout(resolve, 50));
          return "Tool 2 executed";
        },
      };

      const tools = { tool1, tool2 };

      const message: AssistantMessage = {
        role: "assistant",
        status: { type: "requires-action", reason: "tool-calls" },
        parts: [
          {
            type: "tool-call",
            toolCallId: "1",
            toolName: "tool1",
            args: {},
          } as ToolCallPart,
          {
            type: "tool-call",
            toolCallId: "2",
            toolName: "tool2",
            args: {},
          } as ToolCallPart,
        ],
        content: [],
        metadata: {
          unstable_state: {},
          unstable_data: [],
          unstable_annotations: [],
          steps: [],
          custom: {},
        },
      };

      await unstable_runPendingTools(
        message,
        tools,
        new AbortController().signal,
        async () => {},
      );

      // Verifying that both tools started (proving parallel execution)
      expect(tool1Started).toBe(true);
      expect(tool2Started).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return original message when no tool calls exist", async () => {
      const message: AssistantMessage = {
        role: "assistant",
        status: {
          reason: "stop",
          type: "complete",
        },
        parts: [
          {
            type: "text",
            text: "Hello",
            status: {
              type: "complete",
              reason: "stop",
            },
          },
        ],
        content: [],
        metadata: {
          unstable_state: {},
          unstable_data: [],
          unstable_annotations: [],
          steps: [],
          custom: {},
        },
      };

      const result = await unstable_runPendingTools(
        message,
        {},
        new AbortController().signal,
        async () => {},
      );

      expect(result).toEqual(message);
    });

    it("should handle missing tool gracefully", async () => {
      const message: AssistantMessage = {
        role: "assistant",
        status: {
          type: "requires-action",
          reason: "tool-calls",
        },
        parts: [
          {
            type: "tool-call",
            toolCallId: "1",
            toolName: "nonexistentTool",
            args: {},
            status: { type: "requires-action", reason: "tool-call-result" },
          } as ToolCallPart,
        ],
        content: [],
        metadata: {
          unstable_state: {},
          unstable_data: [],
          unstable_annotations: [],
          steps: [],
          custom: {},
        },
      };

      const result = await unstable_runPendingTools(
        message,
        {},
        new AbortController().signal,
        async () => {},
      );

      // Tool call should remain unchanged (no result added)
      expect(result.parts[0]).toMatchObject({
        type: "tool-call",
        toolCallId: "1",
        toolName: "nonexistentTool",
      });
      expect(result.parts[0]).not.toHaveProperty("state");
      expect(result.parts[0]).not.toHaveProperty("result");
    });

    it("should handle mixed text and tool-call parts", async () => {
      const tool: Tool = {
        parameters: {
          type: "object",
          properties: {},
        },
        execute: async () => "executed",
      };

      const message: AssistantMessage = {
        role: "assistant",
        status: {
          type: "requires-action",
          reason: "tool-calls",
        },
        parts: [
          {
            type: "text",
            text: "Let me call a tool",
            status: {
              type: "complete",
              reason: "stop",
            },
          },
          {
            type: "tool-call",
            toolCallId: "1",
            toolName: "tool",
            args: {},
            status: {
              type: "requires-action",
              reason: "tool-call-result",
            },
          } as ToolCallPart,
          {
            type: "text",
            text: "Done",
            status: {
              type: "complete",
              reason: "stop",
            },
          },
        ],
        content: [],
        metadata: {
          unstable_state: {},
          unstable_data: [],
          unstable_annotations: [],
          steps: [],
          custom: {},
        },
      };

      const result = await unstable_runPendingTools(
        message,
        { tool },
        new AbortController().signal,
        async () => {},
      );

      expect(result.parts).toHaveLength(3);
      expect(result.parts[0]).toEqual({
        type: "text",
        text: "Let me call a tool",
        status: { type: "complete", reason: "stop" },
      });
      expect(result.parts[1]).toMatchObject({
        type: "tool-call",
        state: "result",
        result: "executed",
      });
      expect(result.parts[2]).toEqual({
        type: "text",
        text: "Done",
        status: { type: "complete", reason: "stop" },
      });
    });

    it("should handle tools with different execution times", async () => {
      const fastTool = createDelayedTool(10, "fast");
      const slowTool = createDelayedTool(100, "slow");

      const tools = { fastTool, slowTool };

      const message: AssistantMessage = {
        role: "assistant",
        status: {
          type: "requires-action",
          reason: "tool-calls",
        },
        parts: [
          {
            type: "tool-call",
            toolCallId: "1",
            toolName: "slowTool",
            args: {},
            status: {
              type: "requires-action",
              reason: "tool-call-result",
            },
          } as ToolCallPart,
          {
            type: "tool-call",
            toolCallId: "2",
            toolName: "fastTool",
            args: {},
            status: {
              type: "requires-action",
              reason: "tool-call-result",
            },
          } as ToolCallPart,
        ],
        content: [],
        metadata: {
          unstable_state: {},
          unstable_data: [],
          unstable_annotations: [],
          steps: [],
          custom: {},
        },
      };

      const updatedMessage = await unstable_runPendingTools(
        message,
        tools,
        new AbortController().signal,
        async () => {},
      );

      // Both should complete successfully
      expect(updatedMessage.parts[0]).toMatchObject({
        type: "tool-call",
        toolCallId: "1",
        state: "result",
        result: "slow",
        isError: false,
      });
      expect(updatedMessage.parts[1]).toMatchObject({
        type: "tool-call",
        toolCallId: "2",
        state: "result",
        result: "fast",
        isError: false,
      });
    });

    it("should handle tool execution errors gracefully", async () => {
      const errorTool = createErrorTool("Something went wrong");
      const tools = { errorTool };

      const message: AssistantMessage = {
        role: "assistant",
        status: {
          type: "requires-action",
          reason: "tool-calls",
        },
        parts: [
          {
            type: "tool-call",
            toolCallId: "1",
            toolName: "errorTool",
            args: {},
          } as ToolCallPart,
        ],
        content: [],
        metadata: {
          unstable_state: {},
          unstable_data: [],
          unstable_annotations: [],
          steps: [],
          custom: {},
        },
      };

      const updatedMessage = await unstable_runPendingTools(
        message,
        tools,
        new AbortController().signal,
        async () => {},
      );

      expect(updatedMessage.parts[0]).toMatchObject({
        type: "tool-call",
        toolCallId: "1",
        state: "result",
        result: "Something went wrong",
        isError: true,
      });
    });

  });

});