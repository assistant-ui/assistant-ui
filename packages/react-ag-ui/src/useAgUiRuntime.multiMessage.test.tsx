// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import type { AssistantRuntime, ToolCallMessagePart } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useAssistantTool,
} from "@assistant-ui/core/react";
import type { HttpAgent } from "@ag-ui/client";
import { z } from "zod";
import { useAgUiRuntime } from "./useAgUiRuntime";

type Subscriber = Record<string, ((payload: any) => void) | undefined>;

const toolCalls = (runtime: AssistantRuntime): ToolCallMessagePart[] =>
  runtime.thread
    .getState()
    .messages.flatMap((message) => message.content as readonly unknown[])
    .filter(
      (part): part is ToolCallMessagePart =>
        (part as ToolCallMessagePart).type === "tool-call",
    );

const flush = () =>
  act(async () => void (await new Promise((r) => setTimeout(r, 0))));

const textEvents = (
  subscriber: Subscriber,
  messageId: string,
  text: string,
) => {
  subscriber.onTextMessageStartEvent?.({
    event: { type: "TEXT_MESSAGE_START", messageId },
  });
  subscriber.onTextMessageContentEvent?.({
    event: { type: "TEXT_MESSAGE_CONTENT", messageId, delta: text },
  });
  subscriber.onTextMessageEndEvent?.({
    event: { type: "TEXT_MESSAGE_END", messageId },
  });
};

afterEach(() => cleanup());

describe("useAgUiRuntime multi-message runs", () => {
  it("resumes after a frontend tool result when a second text message follows the call", async () => {
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      if (runAgent.mock.calls.length > 1) {
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: "run-2" },
        });
        subscriber.onRunFinalized?.(undefined);
        return;
      }
      textEvents(subscriber, "m1", "Let me check.");
      subscriber.onToolCallStartEvent?.({
        event: {
          type: "TOOL_CALL_START",
          toolCallId: "tc-1",
          toolCallName: "delete_file",
        },
      });
      subscriber.onToolCallArgsEvent?.({
        event: {
          type: "TOOL_CALL_ARGS",
          toolCallId: "tc-1",
          delta: '{"path":"/tmp/a"}',
        },
      });
      subscriber.onToolCallEndEvent?.({
        event: { type: "TOOL_CALL_END", toolCallId: "tc-1" },
      });
      textEvents(subscriber, "m2", "Working on it.");
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: "run-1" },
      });
      subscriber.onRunFinalized?.(undefined);
    });
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;

    const execute = vi.fn(async () => ({ deleted: true }));
    const DeleteFileTool = () => {
      useAssistantTool({
        toolName: "delete_file",
        description: "delete a file",
        parameters: z.object({ path: z.string() }),
        execute,
      });
      return null;
    };

    const { result } = renderHook(() => useAgUiRuntime({ agent }));
    render(
      <AssistantRuntimeProvider runtime={result.current}>
        <DeleteFileTool />
      </AssistantRuntimeProvider>,
    );
    await flush();

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "delete it" }],
      });
    });
    await flush();
    await flush();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(toolCalls(result.current)[0]!.result).toEqual({ deleted: true });
    expect(runAgent).toHaveBeenCalledTimes(2);

    const texts = result.current.thread
      .getState()
      .messages.filter((message) => message.role === "assistant")
      .flatMap((message) => message.content)
      .filter((part) => part.type === "text")
      .map((part) => (part as { text: string }).text);
    expect(texts).toEqual(["Let me check.", "Working on it."]);
  });
});
