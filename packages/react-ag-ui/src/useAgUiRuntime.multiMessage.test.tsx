// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import type {
  AssistantRuntime,
  ThreadHistoryAdapter,
  ToolCallMessagePart,
} from "@assistant-ui/core";
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

const toolCallEvents = (
  subscriber: Subscriber,
  toolCallId: string,
  toolCallName: string,
  args: string,
) => {
  subscriber.onToolCallStartEvent?.({
    event: { type: "TOOL_CALL_START", toolCallId, toolCallName },
  });
  subscriber.onToolCallArgsEvent?.({
    event: { type: "TOOL_CALL_ARGS", toolCallId, delta: args },
  });
  subscriber.onToolCallEndEvent?.({
    event: { type: "TOOL_CALL_END", toolCallId },
  });
};

const renderRuntime = (
  runAgent: ReturnType<typeof vi.fn>,
  tools: React.ReactNode,
  history?: ThreadHistoryAdapter,
) => {
  const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
  const { result } = renderHook(() =>
    useAgUiRuntime({ agent, ...(history ? { adapters: { history } } : {}) }),
  );
  render(
    <AssistantRuntimeProvider runtime={result.current}>
      {tools}
    </AssistantRuntimeProvider>,
  );
  return result;
};

const appendUserMessage = async (
  runtime: { current: AssistantRuntime },
  text: string,
) => {
  await act(async () => {
    await runtime.current.thread.append({
      role: "user",
      content: [{ type: "text", text }],
    });
  });
  await flush();
  await flush();
};

afterEach(() => cleanup());

describe("useAgUiRuntime multi-message runs", () => {
  it("resumes with the tool record after a frontend result when a second text message follows the call", async () => {
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      if (runAgent.mock.calls.length > 1) {
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: "run-2" },
        });
        subscriber.onRunFinalized?.(undefined);
        return;
      }
      textEvents(subscriber, "m1", "Let me check.");
      toolCallEvents(subscriber, "tc-1", "delete_file", '{"path":"/tmp/a"}');
      textEvents(subscriber, "m2", "Working on it.");
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: "run-1" },
      });
      subscriber.onRunFinalized?.(undefined);
    });

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

    const runtime = renderRuntime(runAgent, <DeleteFileTool />);
    await flush();
    await appendUserMessage(runtime, "delete it");

    expect(execute).toHaveBeenCalledTimes(1);
    expect(toolCalls(runtime.current)[0]!.result).toEqual({ deleted: true });
    expect(runAgent).toHaveBeenCalledTimes(2);

    const resumeInput = runAgent.mock.calls[1]![0] as {
      messages: { role: string; toolCallId?: string; content?: string }[];
    };
    const toolRecord = resumeInput.messages.find(
      (message) => message.role === "tool" && message.toolCallId === "tc-1",
    );
    expect(toolRecord?.content).toBe(JSON.stringify({ deleted: true }));

    const texts = runtime.current.thread
      .getState()
      .messages.filter((message) => message.role === "assistant")
      .flatMap((message) => message.content)
      .filter((part) => part.type === "text")
      .map((part) => (part as { text: string }).text);
    expect(texts).toEqual(["Let me check.", "Working on it."]);
  });

  it("persists the pending tool-call owner before its child message", async () => {
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      if (runAgent.mock.calls.length > 1) {
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: "run-2" },
        });
        subscriber.onRunFinalized?.(undefined);
        return;
      }
      textEvents(subscriber, "m1", "Let me check.");
      toolCallEvents(subscriber, "tc-1", "delete_file", '{"path":"/tmp/a"}');
      textEvents(subscriber, "m2", "Working on it.");
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: "run-1" },
      });
      subscriber.onRunFinalized?.(undefined);
    });

    let releaseTool!: () => void;
    const held = new Promise<void>((r) => (releaseTool = r));
    const execute = vi.fn(() => held.then(() => ({ deleted: true })));
    const DeleteFileTool = () => {
      useAssistantTool({
        toolName: "delete_file",
        description: "delete a file",
        parameters: z.object({ path: z.string() }),
        execute,
      });
      return null;
    };

    const history: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ headId: null, messages: [] }),
      append: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const runtime = renderRuntime(runAgent, <DeleteFileTool />, history);
    await flush();
    await appendUserMessage(runtime, "delete it");

    const appendedIds = () =>
      (history.append as ReturnType<typeof vi.fn>).mock.calls
        .map(([entry]) => entry.message.id as string)
        .filter((id) => id === "m1" || id === "m2");

    expect(appendedIds()).toEqual([]);

    await act(async () => {
      releaseTool();
      await new Promise((r) => setTimeout(r, 0));
    });
    await flush();
    await flush();

    expect(appendedIds()).toEqual(["m1", "m2"]);
    const m1Entry = (
      history.append as ReturnType<typeof vi.fn>
    ).mock.calls.find(([entry]) => entry.message.id === "m1")![0];
    expect(m1Entry.message.status).toMatchObject({ type: "complete" });
    const m2Entry = (
      history.append as ReturnType<typeof vi.fn>
    ).mock.calls.find(([entry]) => entry.message.id === "m2")![0];
    expect(m2Entry.parentId).toBe("m1");
    expect(runAgent).toHaveBeenCalledTimes(2);
  });

  it("starts one continuation only after every pending owner resolves", async () => {
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      if (runAgent.mock.calls.length > 1) {
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: "run-2" },
        });
        subscriber.onRunFinalized?.(undefined);
        return;
      }
      textEvents(subscriber, "m1", "First step.");
      toolCallEvents(subscriber, "tc-1", "tool_a", "{}");
      textEvents(subscriber, "m2", "Second step.");
      toolCallEvents(subscriber, "tc-2", "tool_b", "{}");
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: "run-1" },
      });
      subscriber.onRunFinalized?.(undefined);
    });

    let releaseA!: () => void;
    const heldA = new Promise<void>((r) => (releaseA = r));
    let releaseB!: () => void;
    const heldB = new Promise<void>((r) => (releaseB = r));
    const Tools = () => {
      useAssistantTool({
        toolName: "tool_a",
        description: "a",
        parameters: z.object({}),
        execute: () => heldA.then(() => ({ a: true })),
      });
      useAssistantTool({
        toolName: "tool_b",
        description: "b",
        parameters: z.object({}),
        execute: () => heldB.then(() => ({ b: true })),
      });
      return null;
    };

    const runtime = renderRuntime(runAgent, <Tools />);
    await flush();
    await appendUserMessage(runtime, "go");

    await act(async () => {
      releaseA();
      await new Promise((r) => setTimeout(r, 0));
    });
    await flush();
    expect(
      toolCalls(runtime.current).find((part) => part.toolCallId === "tc-1")
        ?.result,
    ).toEqual({ a: true });
    expect(runAgent).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseB();
      await new Promise((r) => setTimeout(r, 0));
    });
    await flush();
    await flush();
    expect(runAgent).toHaveBeenCalledTimes(2);
  });

  it("does not resume past an open interrupt gate", async () => {
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      textEvents(subscriber, "m1", "Let me check.");
      toolCallEvents(subscriber, "tc-1", "delete_file", '{"path":"/tmp/a"}');
      textEvents(subscriber, "m2", "One more thing.");
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: "run-1",
          outcome: {
            type: "interrupt",
            interrupts: [
              {
                id: "int-1",
                reason: "tool_call",
                toolCallId: "tc-9",
                message: "Approve something else?",
              },
            ],
          },
        },
      });
      subscriber.onRunFinalized?.(undefined);
    });

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

    const runtime = renderRuntime(runAgent, <DeleteFileTool />);
    await flush();
    await appendUserMessage(runtime, "delete it");
    await flush();

    const call = toolCalls(runtime.current).find(
      (part) => part.toolCallId === "tc-1",
    );
    expect(call?.result).toEqual({ deleted: true });
    expect(runAgent).toHaveBeenCalledTimes(1);
  });
});
