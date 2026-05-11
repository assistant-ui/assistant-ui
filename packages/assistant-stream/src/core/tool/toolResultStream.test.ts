import { describe, expect, it, vi } from "vitest";
import {
  toolResultStream as unstable_toolResultStream,
  unstable_runPendingTools,
} from "./toolResultStream";
import { ToolResponse } from "./ToolResponse";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import type { AssistantMessage, ToolCallPart } from "../utils/types";
import type { Tool } from "./tool-types";

const createDelayedTool = (delay: number, result?: string): Tool => ({
  parameters: { type: "object", properties: {} },
  execute: async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return result ?? `Tool with ${delay}ms delay executed`;
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
  });

  describe("toModelOutput", () => {
    it("attaches modelContent from toModelOutput onto the resolved tool-call part", async () => {
      const tool: Tool = {
        parameters: { type: "object", properties: {} },
        execute: async () => ({
          mediaType: "application/pdf",
          base64: "JVBERi0xLjQK",
        }),
        toModelOutput: ({ output }) => {
          const o = output as { base64: string; mediaType: string };
          return [
            { type: "text", text: "PDF contents:" },
            {
              type: "file",
              data: o.base64,
              mediaType: o.mediaType,
            },
          ];
        },
      };

      const message: AssistantMessage = {
        role: "assistant",
        status: { type: "requires-action", reason: "tool-calls" },
        parts: [
          {
            type: "tool-call",
            toolCallId: "tc-1",
            toolName: "readPdf",
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

      const updated = await unstable_runPendingTools(
        message,
        { readPdf: tool },
        new AbortController().signal,
        async () => {},
      );

      expect(updated.parts[0]).toMatchObject({
        type: "tool-call",
        state: "result",
        result: { mediaType: "application/pdf", base64: "JVBERi0xLjQK" },
        modelContent: [
          { type: "text", text: "PDF contents:" },
          {
            type: "file",
            data: "JVBERi0xLjQK",
            mediaType: "application/pdf",
          },
        ],
      });
    });

    it("does not call toModelOutput when the ToolResponse already carries modelContent", async () => {
      let called = false;
      const tool: Tool = {
        parameters: { type: "object", properties: {} },
        execute: async () =>
          new ToolResponse({
            result: { ok: true },
            modelContent: [{ type: "text", text: "preset" }],
          }),
        toModelOutput: () => {
          called = true;
          return [{ type: "text", text: "should not run" }];
        },
      };

      const message: AssistantMessage = {
        role: "assistant",
        status: { type: "requires-action", reason: "tool-calls" },
        parts: [
          {
            type: "tool-call",
            toolCallId: "tc-1",
            toolName: "preset",
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

      const updated = await unstable_runPendingTools(
        message,
        { preset: tool },
        new AbortController().signal,
        async () => {},
      );

      expect(called).toBe(false);
      expect(updated.parts[0]).toMatchObject({
        type: "tool-call",
        state: "result",
        modelContent: [{ type: "text", text: "preset" }],
      });
    });

    it("falls back to the successful execute result when toModelOutput itself throws", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const tool: Tool = {
        parameters: { type: "object", properties: {} },
        execute: async () => ({ ok: true }),
        toModelOutput: () => {
          throw new Error("projection failed");
        },
      };

      const message: AssistantMessage = {
        role: "assistant",
        status: { type: "requires-action", reason: "tool-calls" },
        parts: [
          {
            type: "tool-call",
            toolCallId: "tc-1",
            toolName: "flaky",
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

      const updated = await unstable_runPendingTools(
        message,
        { flaky: tool },
        new AbortController().signal,
        async () => {},
      );

      expect(updated.parts[0]).toMatchObject({
        type: "tool-call",
        state: "result",
        result: { ok: true },
        isError: false,
      });
      expect(updated.parts[0]).not.toHaveProperty("modelContent");
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(`tool "flaky" toModelOutput threw`),
        expect.any(Error),
      );
      warn.mockRestore();
    });

    it("forwards modelContent through the streaming path (toolResultStream + ToolExecutionStream)", async () => {
      const tool: Tool = {
        parameters: { type: "object", properties: {} },
        execute: async () => ({
          mediaType: "application/pdf",
          base64: "JVBERi0xLjQK",
        }),
        toModelOutput: ({ output }) => {
          const o = output as { mediaType: string; base64: string };
          return [
            { type: "text", text: "PDF contents:" },
            { type: "file", data: o.base64, mediaType: o.mediaType },
          ];
        },
      };

      const inputChunks: AssistantStreamChunk[] = [
        {
          type: "part-start",
          path: [],
          part: {
            type: "tool-call",
            toolCallId: "tc-stream-1",
            toolName: "readPdf",
          },
        },
        { type: "text-delta", path: [0], textDelta: "{}" },
        { type: "tool-call-args-text-finish", path: [0] },
        { type: "part-finish", path: [0] },
      ];

      const inputStream = new ReadableStream<AssistantStreamChunk>({
        start(controller) {
          for (const chunk of inputChunks) controller.enqueue(chunk);
          controller.close();
        },
      });

      const outputChunks: AssistantStreamChunk[] = [];
      await inputStream
        .pipeThrough(
          unstable_toolResultStream(
            { readPdf: tool },
            new AbortController().signal,
            async () => {},
          ),
        )
        .pipeTo(
          new WritableStream<AssistantStreamChunk>({
            write(chunk) {
              outputChunks.push(chunk);
            },
          }),
        );

      const resultChunk = outputChunks.find((c) => c.type === "result") as
        | (AssistantStreamChunk & { type: "result" })
        | undefined;
      expect(resultChunk).toBeDefined();
      expect(resultChunk?.result).toEqual({
        mediaType: "application/pdf",
        base64: "JVBERi0xLjQK",
      });
      expect(resultChunk?.isError).toBe(false);
      expect(resultChunk?.modelContent).toEqual([
        { type: "text", text: "PDF contents:" },
        {
          type: "file",
          data: "JVBERi0xLjQK",
          mediaType: "application/pdf",
        },
      ]);
    });

    it("does not call toModelOutput when the tool errors", async () => {
      let called = false;
      const tool: Tool = {
        parameters: { type: "object", properties: {} },
        execute: async () => {
          throw new Error("boom");
        },
        toModelOutput: () => {
          called = true;
          return [{ type: "text", text: "should not run" }];
        },
      };

      const message: AssistantMessage = {
        role: "assistant",
        status: { type: "requires-action", reason: "tool-calls" },
        parts: [
          {
            type: "tool-call",
            toolCallId: "tc-1",
            toolName: "broken",
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

      try {
        await unstable_runPendingTools(
          message,
          { broken: tool },
          new AbortController().signal,
          async () => {},
        );
      } catch {
        // execute throws; toModelOutput must not have been consulted
      }

      expect(called).toBe(false);
    });
  });
});
