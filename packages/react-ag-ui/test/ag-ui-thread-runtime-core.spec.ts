"use client";

import { describe, expect, it, vi } from "vitest";
import type {
  AppendMessage,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/react";
import type { HttpAgent } from "@ag-ui/client";
import { AgUiThreadRuntimeCore } from "../src/runtime/AgUiThreadRuntimeCore";
import { makeLogger } from "../src/runtime/logger";

const createAppendMessage = (
  overrides: Partial<AppendMessage> = {},
): AppendMessage => ({
  role: "user",
  content: [{ type: "text" as const, text: "hi" }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(),
  parentId: overrides.parentId ?? null,
  sourceId: overrides.sourceId ?? null,
  runConfig: overrides.runConfig ?? {},
  startRun: overrides.startRun ?? true,
});

const noopLogger = makeLogger();

const createCore = (
  agent: HttpAgent,
  hooks: {
    onError?: (e: Error) => void;
    onCancel?: () => void;
    history?: ThreadHistoryAdapter;
  } = {},
) =>
  new AgUiThreadRuntimeCore({
    agent,
    logger: noopLogger,
    showThinking: true,
    ...(hooks.onError ? { onError: hooks.onError } : {}),
    ...(hooks.onCancel ? { onCancel: hooks.onCancel } : {}),
    ...(hooks.history ? { history: hooks.history } : {}),
    notifyUpdate: () => {},
  });

type TestRunConfig = { custom?: Record<string, unknown> };

describe("AGUIThreadRuntimeCore", () => {
  it("streams assistant output into thread messages", async () => {
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onTextMessageContentEvent?.({
          event: { type: "TEXT_MESSAGE_CONTENT", delta: "Hello" },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    const messages = core.getMessages();
    expect(messages).toHaveLength(2);
    const assistant = messages.at(-1) as ThreadAssistantMessage;
    expect(assistant.role).toBe("assistant");
    expect(assistant.content[0]).toMatchObject({ type: "text", text: "Hello" });
    expect(assistant.status).toMatchObject({
      type: "complete",
      reason: "unknown",
    });
    expect(core.isRunning()).toBe(false);
  });

  it("marks runs as cancelled when aborting", async () => {
    const agent = {
      runAgent: vi.fn((_input, _subscriber, { signal }) => {
        return new Promise((_, reject) => {
          signal.addEventListener("abort", () => {
            const err = new Error("aborted");
            (err as any).name = "AbortError";
            reject(err);
          });
        });
      }),
    } as unknown as HttpAgent;

    const onCancel = vi.fn();
    const core = createCore(agent, { onCancel });
    const promise = core.append(createAppendMessage());
    await core.cancel();
    await promise;

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.status).toMatchObject({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("surfaces errors and rejects append", async () => {
    const agent = {
      runAgent: vi.fn(async () => {
        throw new Error("boom");
      }),
    } as unknown as HttpAgent;

    const onError = vi.fn();
    const core = createCore(agent, { onError });

    await expect(core.append(createAppendMessage())).rejects.toThrow("boom");
    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: "boom",
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("updates tool call result entries", () => {
    const agent = {
      runAgent: vi.fn(async () => {}),
    } as unknown as HttpAgent;

    const toolMessage: ThreadAssistantMessage = {
      id: "assistant",
      role: "assistant",
      createdAt: new Date(),
      status: { type: "complete", reason: "unknown" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        {
          type: "tool-call" as const,
          toolCallId: "call-1",
          toolName: "search",
          args: {},
          argsText: "{}",
        },
      ],
    };

    const core = createCore(agent);
    core.applyExternalMessages([toolMessage as ThreadMessage]);

    core.addToolResult({
      messageId: "assistant",
      toolCallId: "call-1",
      toolName: "search",
      result: { ok: true },
      isError: false,
    });

    const updated = core.getMessages()[0] as ThreadAssistantMessage;
    const part = updated.content[0] as any;
    expect(part.result).toEqual({ ok: true });
    expect(part.isError).toBe(false);
  });

  it("auto-resumes run after all tool results are added", async () => {
    const runInputs: any[] = [];
    let runCount = 0;

    const agent = {
      runAgent: vi.fn(async (input, subscriber) => {
        runInputs.push(JSON.parse(JSON.stringify(input)));
        runCount++;

        if (runCount === 1) {
          subscriber.onToolCallStartEvent?.({
            event: {
              type: "TOOL_CALL_START",
              toolCallId: "call-1",
              toolCallName: "get_weather",
            },
          });
          subscriber.onToolCallArgsEvent?.({
            event: {
              type: "TOOL_CALL_ARGS",
              toolCallId: "call-1",
              delta: '{"city":"Paris"}',
            },
          });
          subscriber.onToolCallEndEvent?.({
            event: { type: "TOOL_CALL_END", toolCallId: "call-1" },
          });
          subscriber.onRunFinalized?.();
        } else {
          subscriber.onTextMessageContentEvent?.({
            event: { type: "TEXT_MESSAGE_CONTENT", delta: "It is sunny!" },
          });
          subscriber.onRunFinalized?.();
        }
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    // Find the assistant message with the tool call
    const assistantMsg = core
      .getMessages()
      .find((m) => m.role === "assistant") as ThreadAssistantMessage;
    expect(assistantMsg).toBeTruthy();

    // Simulate frontend tool execution completing
    const resumePromise = new Promise<void>((resolve) => {
      const origRunAgent = agent.runAgent;
      agent.runAgent = vi.fn(async (...args: any[]) => {
        await (origRunAgent as any)(...args);
        resolve();
      });
    });

    core.addToolResult({
      messageId: assistantMsg.id,
      toolCallId: "call-1",
      toolName: "get_weather",
      result: { temperature: "22C" },
      isError: false,
    });

    await resumePromise;

    // Verify a second run was triggered
    expect(runCount).toBe(2);

    // Verify the second run input includes the tool result
    const run2Messages = runInputs[1]?.messages ?? [];
    const toolResultMsg = run2Messages.find(
      (m: { role: string }) => m.role === "tool",
    );
    expect(toolResultMsg).toBeTruthy();
    expect(toolResultMsg.toolCallId).toBe("call-1");
    expect(toolResultMsg.content).toContain("22C");
  });

  it("does not auto-resume when some tool calls still lack results", async () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      subscriber.onToolCallStartEvent?.({
        event: {
          type: "TOOL_CALL_START",
          toolCallId: "call-1",
          toolCallName: "tool_a",
        },
      });
      subscriber.onToolCallEndEvent?.({
        event: { type: "TOOL_CALL_END", toolCallId: "call-1" },
      });
      subscriber.onToolCallStartEvent?.({
        event: {
          type: "TOOL_CALL_START",
          toolCallId: "call-2",
          toolCallName: "tool_b",
        },
      });
      subscriber.onToolCallEndEvent?.({
        event: { type: "TOOL_CALL_END", toolCallId: "call-2" },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;
    const core = createCore(agent);
    await core.append(createAppendMessage());

    const assistantMsg = core
      .getMessages()
      .find((m) => m.role === "assistant") as ThreadAssistantMessage;

    // Add result for only one tool call
    core.addToolResult({
      messageId: assistantMsg.id,
      toolCallId: "call-1",
      toolName: "tool_a",
      result: "done",
      isError: false,
    });

    // Should NOT have triggered a second run
    expect(runAgent).toHaveBeenCalledTimes(1);
  });

  it("resumes runs when requested", async () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;
    const core = createCore(agent);
    await core.append(createAppendMessage());

    await core.resume({
      parentId: null,
      sourceId: null,
      runConfig: {} as TestRunConfig,
    });

    expect(runAgent).toHaveBeenCalledTimes(2);
  });

  it("omits the placeholder assistant message from run input history", async () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    const input = runAgent.mock.calls[0]?.[0];
    expect(input).toBeTruthy();
    const containsEmptyAssistant = input.messages.some(
      (message: { role: string; content: string }) =>
        message.role === "assistant" && message.content === "",
    );
    expect(containsEmptyAssistant).toBe(false);
  });

  it("loads history on __internal_load", async () => {
    const agent = { runAgent: vi.fn() } as unknown as HttpAgent;

    const userMessage: ThreadMessage = {
      id: "msg-1",
      role: "user",
      createdAt: new Date(),
      content: [{ type: "text", text: "Hello" }],
      metadata: { custom: {} },
    };
    const assistantMessage: ThreadAssistantMessage = {
      id: "msg-2",
      role: "assistant",
      createdAt: new Date(),
      status: { type: "complete", reason: "unknown" },
      content: [{ type: "text", text: "Hi there!" }],
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };

    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({
        headId: "msg-2",
        messages: [
          { message: userMessage, parentId: null },
          { message: assistantMessage, parentId: "msg-1" },
        ],
      }),
      append: vi.fn().mockResolvedValue(undefined),
    };

    const core = createCore(agent, { history: historyAdapter });

    expect(core.isLoading).toBe(false);
    const loadPromise = core.__internal_load();
    expect(core.isLoading).toBe(true);

    await loadPromise;

    expect(historyAdapter.load).toHaveBeenCalledTimes(1);
    expect(core.isLoading).toBe(false);
    expect(core.getMessages()).toHaveLength(2);
    expect(core.getMessages()[0]?.id).toBe("msg-1");
    expect(core.getMessages()[1]?.id).toBe("msg-2");
  });

  it("returns existing promise if __internal_load called multiple times", async () => {
    const agent = { runAgent: vi.fn() } as unknown as HttpAgent;

    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue(null),
      append: vi.fn(),
    };

    const core = createCore(agent, { history: historyAdapter });

    const promise1 = core.__internal_load();
    const promise2 = core.__internal_load();

    expect(promise1).toBe(promise2);
    await promise1;

    expect(historyAdapter.load).toHaveBeenCalledTimes(1);
  });

  it("handles missing history adapter gracefully", async () => {
    const agent = { runAgent: vi.fn() } as unknown as HttpAgent;
    const core = createCore(agent);

    await core.__internal_load();

    expect(core.getMessages()).toHaveLength(0);
    expect(core.isLoading).toBe(false);
  });

  it("triggers startRun when unstable_resume is true", async () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const userMessage: ThreadMessage = {
      id: "msg-1",
      role: "user",
      createdAt: new Date(),
      content: [{ type: "text", text: "Hello" }],
      metadata: { custom: {} },
    };

    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({
        headId: "msg-1",
        messages: [{ message: userMessage, parentId: null }],
        unstable_resume: true,
      }),
      append: vi.fn().mockResolvedValue(undefined),
    };

    const core = createCore(agent, { history: historyAdapter });
    await core.__internal_load();

    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(core.getMessages().length).toBeGreaterThanOrEqual(1);
  });

  it("calls onError when history.load() throws", async () => {
    const agent = { runAgent: vi.fn() } as unknown as HttpAgent;
    const onError = vi.fn();

    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockRejectedValue(new Error("load failed")),
      append: vi.fn(),
    };

    const core = createCore(agent, { onError, history: historyAdapter });
    await core.__internal_load();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0][0].message).toBe("load failed");
    expect(core.isLoading).toBe(false);
  });

  it("resets isLoading to false when history.load() throws", async () => {
    const agent = { runAgent: vi.fn() } as unknown as HttpAgent;

    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockRejectedValue(new Error("network error")),
      append: vi.fn(),
    };

    const core = createCore(agent, { history: historyAdapter });

    expect(core.isLoading).toBe(false);
    const loadPromise = core.__internal_load();
    expect(core.isLoading).toBe(true);

    await loadPromise;

    expect(core.isLoading).toBe(false);
    expect(core.getMessages()).toHaveLength(0);
  });

  it("converts non-Error throws to Error in onError callback", async () => {
    const agent = { runAgent: vi.fn() } as unknown as HttpAgent;
    const onError = vi.fn();

    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockRejectedValue("string error"),
      append: vi.fn(),
    };

    const core = createCore(agent, { onError, history: historyAdapter });
    await core.__internal_load();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0][0].message).toBe("string error");
  });
});
