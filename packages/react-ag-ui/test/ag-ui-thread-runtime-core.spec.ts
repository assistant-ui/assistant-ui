"use client";

import { describe, expect, it, vi } from "vitest";
import type {
  AppendMessage,
  ChatModelRunResult,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import type { HttpAgent } from "@ag-ui/client";
import { AgUiThreadRuntimeCore } from "../src/runtime/AgUiThreadRuntimeCore";
import { makeLogger, type Logger } from "../src/runtime/logger";

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
    logger?: Logger;
  } = {},
) =>
  new AgUiThreadRuntimeCore({
    agent,
    logger: hooks.logger ?? noopLogger,
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

  it("imports tool role messages from snapshots as assistant tool-call results", async () => {
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onMessagesSnapshotEvent?.({
          event: {
            type: "MESSAGES_SNAPSHOT",
            messages: [
              {
                id: "msg-1",
                role: "user",
                content: "What's the weather?",
              },
              {
                id: "msg-2",
                role: "assistant",
                content: "",
                toolCalls: [
                  {
                    id: "call-1",
                    type: "function",
                    function: {
                      name: "get_weather",
                      arguments: '{"city":"Paris"}',
                    },
                  },
                ],
              },
              {
                id: "msg-3",
                role: "tool",
                toolCallId: "call-1",
                content: '{"temperature":"22C"}',
              },
            ],
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    const messages = core.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      id: "msg-1",
      role: "user",
    });
    const assistant = messages[1] as ThreadAssistantMessage;
    expect(assistant.id).toBe("msg-2");
    const toolPart = assistant.content.find(
      (part) => part.type === "tool-call",
    ) as any;
    expect(toolPart).toBeTruthy();
    expect(toolPart).toMatchObject({
      toolCallId: "call-1",
      toolName: "get_weather",
      result: { temperature: "22C" },
    });
  });

  it("preserves tool message IDs when rerunning imported snapshots", async () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      if (runAgent.mock.calls.length === 1) {
        subscriber.onMessagesSnapshotEvent?.({
          event: {
            type: "MESSAGES_SNAPSHOT",
            messages: [
              {
                id: "msg-1",
                role: "user",
                content: "What's the weather?",
              },
              {
                id: "msg-2",
                role: "assistant",
                content: "",
                toolCalls: [
                  {
                    id: "call-1",
                    type: "function",
                    function: {
                      name: "get_weather",
                      arguments: '{"city":"Paris"}',
                    },
                  },
                ],
              },
              {
                id: "tool-msg-original-id",
                role: "tool",
                toolCallId: "call-1",
                content: '{"temperature":"22C"}',
              },
            ],
          },
        });
      }

      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    await core.resume({
      parentId: "msg-2",
      sourceId: null,
      runConfig: {} as TestRunConfig,
    });

    const secondInput = runAgent.mock.calls[1]?.[0];
    expect(secondInput).toBeTruthy();
    expect(secondInput.messages).toContainEqual(
      expect.objectContaining({
        id: "tool-msg-original-id",
        role: "tool",
        toolCallId: "call-1",
        content: '{"temperature":"22C"}',
      }),
    );
  });

  it("applies state deltas to the current state snapshot", async () => {
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onStateSnapshotEvent?.({
          event: {
            type: "STATE_SNAPSHOT",
            snapshot: { count: 0, label: "initial" },
          },
        });
        subscriber.onStateDeltaEvent?.({
          event: {
            type: "STATE_DELTA",
            delta: [{ op: "replace", path: "/count", value: 1 }],
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    expect(core.getState()).toEqual({ count: 1, label: "initial" });
  });

  it("applies deltas before a snapshot from an empty state object", async () => {
    const runInputs: any[] = [];
    const agent = {
      runAgent: vi.fn(async (input, subscriber) => {
        runInputs.push(JSON.parse(JSON.stringify(input)));
        if (runInputs.length === 1) {
          subscriber.onStateDeltaEvent?.({
            event: {
              type: "STATE_DELTA",
              delta: [{ op: "add", path: "/foo", value: "bar" }],
            },
          });
        }
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());
    expect(core.getState()).toEqual({ foo: "bar" });

    await core.resume({
      parentId: null,
      sourceId: null,
      runConfig: {} as TestRunConfig,
    });

    expect(runInputs[1].state).toEqual({ foo: "bar" });
  });

  it("applies state deltas after a null state snapshot", async () => {
    const error = vi.fn();
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onStateSnapshotEvent?.({
          event: { type: "STATE_SNAPSHOT", snapshot: null },
        });
        subscriber.onStateDeltaEvent?.({
          event: {
            type: "STATE_DELTA",
            delta: [{ op: "add", path: "/foo", value: "bar" }],
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent, { logger: makeLogger({ error }) });
    await core.append(createAppendMessage());

    expect(core.getState()).toEqual({ foo: "bar" });
    expect(error).not.toHaveBeenCalled();
  });

  it("isolates invalid state deltas and leaves state unchanged", async () => {
    const error = vi.fn();
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onStateSnapshotEvent?.({
          event: { type: "STATE_SNAPSHOT", snapshot: { count: 0 } },
        });
        subscriber.onStateDeltaEvent?.({
          event: {
            type: "STATE_DELTA",
            delta: [{ op: "replace", path: "/missing", value: 1 }],
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent, { logger: makeLogger({ error }) });
    await core.append(createAppendMessage());

    expect(core.getState()).toEqual({ count: 0 });
    expect(error).toHaveBeenCalledWith(
      "[agui] failed to apply state delta",
      expect.any(Error),
    );
  });

  it("does not allow state deltas to modify object prototypes", async () => {
    const error = vi.fn();
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onStateSnapshotEvent?.({
          event: { type: "STATE_SNAPSHOT", snapshot: {} },
        });
        subscriber.onStateDeltaEvent?.({
          event: {
            type: "STATE_DELTA",
            delta: [{ op: "add", path: "/__proto__/polluted", value: true }],
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent, { logger: makeLogger({ error }) });
    await core.append(createAppendMessage());

    expect(core.getState()).toEqual({});
    expect(({} as any).polluted).toBeUndefined();
    expect(error).toHaveBeenCalled();
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

  it("prefers latest pending message when toolCallId is reused", () => {
    const agent = {
      runAgent: vi.fn(async () => {}),
    } as unknown as HttpAgent;

    const previousAssistant: ThreadAssistantMessage = {
      id: "assistant-old",
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
          result: { ok: "old" },
        },
      ],
    };

    const pendingAssistant: ThreadAssistantMessage = {
      id: "assistant-new",
      role: "assistant",
      createdAt: new Date(),
      status: { type: "requires-action", reason: "tool-calls" },
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
    core.applyExternalMessages([
      previousAssistant as ThreadMessage,
      pendingAssistant as ThreadMessage,
    ]);

    const targetMessageId = core.findMessageIdForToolCall("call-1");
    expect(targetMessageId).toBe("assistant-new");

    core.addToolResult({
      messageId: targetMessageId!,
      toolCallId: "call-1",
      toolName: "search",
      result: { ok: "new" },
      isError: false,
    });

    const [oldMessage, newMessage] =
      core.getMessages() as ThreadAssistantMessage[];
    expect((oldMessage.content[0] as any).result).toEqual({ ok: "old" });
    expect((newMessage.content[0] as any).result).toEqual({ ok: "new" });
  });

  it("does not auto-resume when addToolResult does not match a tool call", () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;
    const core = createCore(agent);

    const assistant: ThreadAssistantMessage = {
      id: "assistant",
      role: "assistant",
      createdAt: new Date(),
      status: { type: "requires-action", reason: "tool-calls" },
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
          result: { cached: true },
        },
      ],
    };
    core.applyExternalMessages([assistant as ThreadMessage]);

    core.addToolResult({
      messageId: "assistant",
      toolCallId: "call-missing",
      toolName: "search",
      result: { ignored: true },
      isError: false,
    });

    expect(runAgent).not.toHaveBeenCalled();
    const updated = core.getMessages()[0] as ThreadAssistantMessage;
    expect((updated.content[0] as any).result).toEqual({ cached: true });
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

  it("auto-resumes when a tool result is added before RUN_FINISHED", async () => {
    const runInputs: any[] = [];
    let runCount = 0;
    let core!: AgUiThreadRuntimeCore;

    const agent = {
      runAgent: vi.fn(async (input: any, subscriber: any) => {
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
          // Frontend tool resolves while the run is still streaming, before
          // RUN_FINISHED transitions the message to requires-action.
          const assistantMsg = core
            .getMessages()
            .find((m) => m.role === "assistant") as ThreadAssistantMessage;
          core.addToolResult({
            messageId: assistantMsg.id,
            toolCallId: "call-1",
            toolName: "get_weather",
            result: { temperature: "22C" },
            isError: false,
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

    core = createCore(agent);
    await core.append(createAppendMessage());
    // Let the deferred follow-up run (scheduled at startRun's tail) settle.
    await new Promise((r) => setTimeout(r, 0));

    expect(runCount).toBe(2);

    // The result survives the RUN_FINISHED snapshot instead of being clobbered.
    const assistant = core
      .getMessages()
      .find(
        (m) =>
          m.role === "assistant" &&
          m.content.some((p) => p.type === "tool-call"),
      ) as ThreadAssistantMessage;
    const toolPart = assistant.content.find(
      (p) => p.type === "tool-call",
    ) as any;
    expect(toolPart.result).toEqual({ temperature: "22C" });
    expect(assistant.status).toMatchObject({ type: "complete" });

    // The follow-up run carries the tool result back to the backend.
    const run2Messages = runInputs[1]?.messages ?? [];
    const toolResultMsg = run2Messages.find(
      (m: { role: string }) => m.role === "tool",
    );
    expect(toolResultMsg).toBeTruthy();
    expect(toolResultMsg.toolCallId).toBe("call-1");
    expect(toolResultMsg.content).toContain("22C");
  });

  it("resumes once all parallel tool results arrive across the RUN_FINISHED boundary", async () => {
    const runInputs: any[] = [];
    let runCount = 0;
    let core!: AgUiThreadRuntimeCore;

    const agent = {
      runAgent: vi.fn(async (input: any, subscriber: any) => {
        runInputs.push(JSON.parse(JSON.stringify(input)));
        runCount++;

        if (runCount === 1) {
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
          // Only the first parallel call resolves before the run finishes.
          const assistantMsg = core
            .getMessages()
            .find((m) => m.role === "assistant") as ThreadAssistantMessage;
          core.addToolResult({
            messageId: assistantMsg.id,
            toolCallId: "call-1",
            toolName: "tool_a",
            result: "ra",
            isError: false,
          });
          subscriber.onRunFinalized?.();
        } else {
          subscriber.onRunFinalized?.();
        }
      }),
    } as unknown as HttpAgent;

    core = createCore(agent);
    await core.append(createAppendMessage());
    await new Promise((r) => setTimeout(r, 0));

    // call-2 is still pending, so no follow-up yet, and call-1's early result
    // is preserved rather than wiped by RUN_FINISHED.
    expect(runCount).toBe(1);
    const pending = core
      .getMessages()
      .find((m) => m.role === "assistant") as ThreadAssistantMessage;
    expect(pending.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });
    const call1 = pending.content.find(
      (p) => p.type === "tool-call" && p.toolCallId === "call-1",
    ) as any;
    expect(call1.result).toBe("ra");

    // The remaining call resolves later; now the follow-up fires with both.
    core.addToolResult({
      messageId: pending.id,
      toolCallId: "call-2",
      toolName: "tool_b",
      result: "rb",
      isError: false,
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(runCount).toBe(2);
    const toolMsgs = (runInputs[1]?.messages ?? []).filter(
      (m: { role: string }) => m.role === "tool",
    );
    expect(
      toolMsgs.map((m: { toolCallId: string }) => m.toolCallId).sort(),
    ).toEqual(["call-1", "call-2"]);
  });

  it("does not leak a deferred resume into a later run when the run errors", async () => {
    let runCount = 0;
    let core!: AgUiThreadRuntimeCore;
    const onError = vi.fn();

    const agent = {
      runAgent: vi.fn(async (input: any, subscriber: any) => {
        runCount++;
        if (runCount === 1) {
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
          const assistantMsg = core
            .getMessages()
            .find((m) => m.role === "assistant") as ThreadAssistantMessage;
          core.addToolResult({
            messageId: assistantMsg.id,
            toolCallId: "call-1",
            toolName: "tool_a",
            result: "ok",
            isError: false,
          });
          // RUN_FINISHED defers the resume (the run is still draining)...
          subscriber.onRunFinishedEvent?.({
            event: { type: "RUN_FINISHED", runId: input.runId },
          });
          // ...then the run errors before the deferred resume can fire.
          throw new Error("boom");
        }
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    core = createCore(agent, { onError });

    await expect(core.append(createAppendMessage())).rejects.toThrow("boom");
    await new Promise((r) => setTimeout(r, 0));
    // The errored run must not have scheduled a resume.
    expect(runCount).toBe(1);

    // A later run must not pick up the stale deferred resume.
    await core.reload(null);
    await new Promise((r) => setTimeout(r, 0));
    expect(runCount).toBe(2);
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

  it("replays the resume stream instead of re-running the agent", async () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;
    const core = createCore(agent);
    await core.append(createAppendMessage());
    expect(runAgent).toHaveBeenCalledTimes(1);

    const userId = core.getMessages()[0]!.id;
    const stream = vi.fn(async function* (): AsyncGenerator<
      ChatModelRunResult,
      void,
      unknown
    > {
      yield { content: [{ type: "text", text: "resumed" }] };
      yield {
        content: [{ type: "text", text: "resumed output" }],
        status: { type: "complete", reason: "unknown" },
      };
    });

    await core.resume({
      parentId: userId,
      sourceId: null,
      runConfig: {} as TestRunConfig,
      stream,
    });

    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(stream).toHaveBeenCalledTimes(1);

    const options = stream.mock.calls[0]?.[0];
    expect(options?.messages?.[0]).toMatchObject({ id: userId, role: "user" });
    expect(options?.unstable_assistantMessageId).toBeTruthy();

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.content.at(-1)).toMatchObject({
      type: "text",
      text: "resumed output",
    });
    expect(assistant.status).toMatchObject({
      type: "complete",
      reason: "unknown",
    });
    expect(core.isRunning()).toBe(false);
  });

  it("completes a resumed assistant when the stream omits a terminal status", async () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;
    const core = createCore(agent);
    await core.append(createAppendMessage());

    const userId = core.getMessages()[0]!.id;
    const stream = async function* (): AsyncGenerator<
      ChatModelRunResult,
      void,
      unknown
    > {
      yield { content: [{ type: "text", text: "partial" }] };
    };

    await core.resume({
      parentId: userId,
      sourceId: null,
      runConfig: {} as TestRunConfig,
      stream,
    });

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.status).toMatchObject({
      type: "complete",
      reason: "unknown",
    });
  });

  it("surfaces resume stream errors without wiping streamed content", async () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;
    const onError = vi.fn();
    const core = createCore(agent, { onError });
    await core.append(createAppendMessage());

    const userId = core.getMessages()[0]!.id;
    const stream = async function* (): AsyncGenerator<
      ChatModelRunResult,
      void,
      unknown
    > {
      yield { content: [{ type: "text", text: "before error" }] };
      throw new Error("stream boom");
    };

    await expect(
      core.resume({
        parentId: userId,
        sourceId: null,
        runConfig: {} as TestRunConfig,
        stream,
      }),
    ).rejects.toThrow("stream boom");

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.content.at(-1)).toMatchObject({
      type: "text",
      text: "before error",
    });
    expect(assistant.status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: "stream boom",
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("cancels a resume stream without wiping already-streamed content", async () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;
    const onCancel = vi.fn();
    const core = createCore(agent, { onCancel });
    await core.append(createAppendMessage());

    const userId = core.getMessages()[0]!.id;
    let firstYielded!: () => void;
    const firstYieldedPromise = new Promise<void>((resolve) => {
      firstYielded = resolve;
    });
    const stream = async function* (options: {
      abortSignal: AbortSignal;
    }): AsyncGenerator<ChatModelRunResult, void, unknown> {
      yield { content: [{ type: "text", text: "partial" }] };
      firstYielded();
      await new Promise<void>((resolve) => {
        options.abortSignal.addEventListener("abort", () => resolve(), {
          once: true,
        });
      });
    };

    const resumePromise = core.resume({
      parentId: userId,
      sourceId: null,
      runConfig: {} as TestRunConfig,
      stream,
    });

    await firstYieldedPromise;
    await core.cancel();
    await resumePromise;

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.content.at(-1)).toMatchObject({
      type: "text",
      text: "partial",
    });
    expect(assistant.status).toMatchObject({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(core.isRunning()).toBe(false);
  });

  it("feeds history.resume() stream on unstable_resume instead of re-running", async () => {
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

    const resume = vi.fn(async function* (): AsyncGenerator<
      ChatModelRunResult,
      void,
      unknown
    > {
      yield {
        content: [{ type: "text", text: "recovered" }],
        status: { type: "complete", reason: "unknown" },
      };
    });

    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({
        headId: "msg-1",
        messages: [{ message: userMessage, parentId: null }],
        unstable_resume: true,
      }),
      resume,
      append: vi.fn().mockResolvedValue(undefined),
    };

    const core = createCore(agent, { history: historyAdapter });
    await core.__internal_load();

    expect(resume).toHaveBeenCalledTimes(1);
    expect(runAgent).not.toHaveBeenCalled();

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.content.at(-1)).toMatchObject({
      type: "text",
      text: "recovered",
    });
    expect(assistant.status).toMatchObject({ type: "complete" });
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

  it("captures pending interrupts and resumes via submitInterruptResponses", async () => {
    const runInputs: any[] = [];
    let runCount = 0;

    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      runInputs.push(JSON.parse(JSON.stringify(input)));
      runCount++;

      if (runCount === 1) {
        subscriber.onRunFinishedEvent?.({
          event: {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: {
              type: "interrupt",
              interrupts: [
                {
                  id: "int-1",
                  reason: "tool_call",
                  toolCallId: "call-1",
                  message: "approve?",
                },
              ],
            },
          },
        });
        subscriber.onRunFinalized?.();
        return;
      }
      subscriber.onTextMessageContentEvent?.({
        event: { type: "TEXT_MESSAGE_CONTENT", delta: "Done." },
      });
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: { type: "success" },
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    const pending = core.getPendingInterrupts();
    expect(pending).toBeTruthy();
    expect(pending?.interrupts).toEqual([
      expect.objectContaining({ id: "int-1", reason: "tool_call" }),
    ]);

    await core.submitInterruptResponses([
      { interruptId: "int-1", status: "resolved", payload: { ok: true } },
    ]);

    expect(runCount).toBe(2);
    expect(runInputs[1].resume).toEqual([
      { interruptId: "int-1", status: "resolved", payload: { ok: true } },
    ]);

    const assistant = core
      .getMessages()
      .find((m) => m.role === "assistant") as ThreadAssistantMessage;
    expect(assistant.status).toMatchObject({ type: "complete" });
    expect(assistant.metadata.custom.agui).toBeUndefined();
  });

  it("attaches a TOOL_CALL_RESULT for a prior run's tool call to its owning message", async () => {
    let runCount = 0;
    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      runCount++;
      if (runCount === 1) {
        subscriber.onToolCallStartEvent?.({
          event: {
            type: "TOOL_CALL_START",
            toolCallId: "call-1",
            toolCallName: "ask_question",
          },
        });
        subscriber.onToolCallArgsEvent?.({
          event: {
            type: "TOOL_CALL_ARGS",
            toolCallId: "call-1",
            delta: '{"question":"approve?"}',
          },
        });
        subscriber.onToolCallEndEvent?.({
          event: { type: "TOOL_CALL_END", toolCallId: "call-1" },
        });
        subscriber.onRunFinishedEvent?.({
          event: {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: {
              type: "interrupt",
              interrupts: [
                { id: "int-1", reason: "tool_call", toolCallId: "call-1" },
              ],
            },
          },
        });
        subscriber.onRunFinalized?.();
        return;
      }
      subscriber.onToolCallResultEvent?.({
        event: {
          type: "TOOL_CALL_RESULT",
          messageId: "tool-msg-1",
          toolCallId: "call-1",
          content: '{"answer":"yes"}',
          role: "tool",
        },
      });
      subscriber.onTextMessageContentEvent?.({
        event: { type: "TEXT_MESSAGE_CONTENT", delta: "Done." },
      });
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: { type: "success" },
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());
    await core.submitInterruptResponses([
      { interruptId: "int-1", status: "resolved", payload: { ok: true } },
    ]);

    const assistants = core
      .getMessages()
      .filter((m) => m.role === "assistant") as ThreadAssistantMessage[];
    expect(assistants).toHaveLength(2);

    const [first, second] = assistants;
    const toolPart = first!.content.find((p) => p.type === "tool-call");
    expect(toolPart).toMatchObject({
      toolCallId: "call-1",
      toolName: "ask_question",
      result: { answer: "yes" },
    });
    expect(second!.content.filter((p) => p.type === "tool-call")).toHaveLength(
      0,
    );
    expect(second!.content).toContainEqual(
      expect.objectContaining({ type: "text", text: "Done." }),
    );
  });

  it("falls back to the aggregator when a TOOL_CALL_RESULT has no owning message", async () => {
    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      subscriber.onToolCallResultEvent?.({
        event: {
          type: "TOOL_CALL_RESULT",
          toolCallId: "orphan-1",
          content: "ok",
          role: "tool",
        },
      });
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: { type: "success" },
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    const assistant = core
      .getMessages()
      .find((m) => m.role === "assistant") as ThreadAssistantMessage;
    const toolPart = assistant.content.find((p) => p.type === "tool-call");
    expect(toolPart).toMatchObject({
      toolCallId: "orphan-1",
      toolName: "tool",
      result: "ok",
    });
  });

  it("rejects interrupt resume that does not cover every open interrupt", async () => {
    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [
              { id: "int-1", reason: "tool_call" },
              { id: "int-2", reason: "input_required" },
            ],
          },
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    await expect(
      core.submitInterruptResponses([
        { interruptId: "int-1", status: "resolved" },
      ]),
    ).rejects.toThrow(/missing responses for open interrupts: int-2/);

    expect(runAgent).toHaveBeenCalledTimes(1);
  });

  it("rejects interrupt resume past expiresAt", async () => {
    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [
              {
                id: "int-1",
                reason: "tool_call",
                expiresAt: new Date(Date.now() - 1000).toISOString(),
              },
            ],
          },
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    await expect(
      core.submitInterruptResponses([
        { interruptId: "int-1", status: "resolved" },
      ]),
    ).rejects.toThrow(/expired/);
  });

  it("rejects resume responses with unknown interrupt ids", async () => {
    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [{ id: "int-1", reason: "tool_call" }],
          },
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    await expect(
      core.submitInterruptResponses([
        { interruptId: "int-1", status: "resolved" },
        { interruptId: "int-unknown", status: "resolved" },
      ]),
    ).rejects.toThrow(/unknown interrupt ids: int-unknown/);
    expect(runAgent).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed expiresAt strings", async () => {
    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [
              { id: "int-1", reason: "tool_call", expiresAt: "not-a-date" },
            ],
          },
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    await expect(
      core.submitInterruptResponses([
        { interruptId: "int-1", status: "resolved" },
      ]),
    ).rejects.toThrow(/malformed expiresAt/);
  });

  it("rejects duplicate interruptId in resume responses", async () => {
    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [{ id: "int-1", reason: "tool_call" }],
          },
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    await expect(
      core.submitInterruptResponses([
        { interruptId: "int-1", status: "resolved" },
        { interruptId: "int-1", status: "cancelled" },
      ]),
    ).rejects.toThrow(/duplicate response/);
    expect(runAgent).toHaveBeenCalledTimes(1);
  });

  it("persists interrupt-state assistant message to history before resolution", async () => {
    const append = vi.fn(async () => {});
    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [{ id: "int-1", reason: "tool_call" }],
          },
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;
    const history: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue(null),
      append,
    };

    const core = createCore(agent, { history });
    await core.append(createAppendMessage());
    // wait a microtask cycle so the in-flight history append resolves
    await new Promise((r) => setTimeout(r, 0));

    const persistedRoles = append.mock.calls.map(
      (call: any[]) => call[0].message.role,
    );
    expect(persistedRoles).toEqual(["user", "assistant"]);
    const persistedAssistant = append.mock.calls.find(
      (call: any[]) => call[0].message.role === "assistant",
    )?.[0].message;
    expect(persistedAssistant.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(persistedAssistant.metadata.custom.agui.interrupts).toEqual([
      { id: "int-1", reason: "tool_call" },
    ]);
  });

  it("blocks append/reload/resume while interrupts are pending", async () => {
    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [{ id: "int-1", reason: "tool_call" }],
          },
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());
    expect(core.getPendingInterrupts()?.interrupts).toHaveLength(1);

    await expect(
      core.append(createAppendMessage({ parentId: null })),
    ).rejects.toThrow(/interrupts are pending/);
    await expect(core.reload(null)).rejects.toThrow(/interrupts are pending/);
    await expect(
      core.resume({
        parentId: null,
        sourceId: null,
        runConfig: {} as TestRunConfig,
      }),
    ).rejects.toThrow(/interrupts are pending/);

    expect(runAgent).toHaveBeenCalledTimes(1);
  });

  it("allows submitInterruptResponses to resume past the pending guard", async () => {
    let runCount = 0;
    const runAgent = vi.fn(async (input: any, subscriber: any) => {
      runCount++;
      if (runCount === 1) {
        subscriber.onRunFinishedEvent?.({
          event: {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: {
              type: "interrupt",
              interrupts: [{ id: "int-1", reason: "tool_call" }],
            },
          },
        });
      } else {
        subscriber.onRunFinishedEvent?.({
          event: {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: { type: "success" },
          },
        });
      }
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    await expect(
      core.submitInterruptResponses([
        { interruptId: "int-1", status: "resolved" },
      ]),
    ).resolves.toBeUndefined();
    expect(runCount).toBe(2);
  });

  it("syncs runtime state snapshot onto the agent before runAgent", async () => {
    let stateAtRun: unknown;
    const agent = {
      state: { initial: true },
      runAgent: vi.fn(async function (this: any, _input: any, subscriber: any) {
        stateAtRun = this.state;
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    core.loadExternalState({ initial: false, snapshot: 42 } as any);
    await core.append(createAppendMessage());

    expect(stateAtRun).toEqual({ initial: false, snapshot: 42 });
  });

  it("adopts TEXT_MESSAGE_START.messageId as the ThreadAssistantMessage.id", async () => {
    const serverId = "11111111-1111-1111-1111-111111111111";
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onTextMessageStartEvent?.({
          event: {
            type: "TEXT_MESSAGE_START",
            messageId: serverId,
            role: "assistant",
          },
        });
        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            messageId: serverId,
            delta: "Hello",
          },
        });
        subscriber.onTextMessageEndEvent?.({
          event: { type: "TEXT_MESSAGE_END", messageId: serverId },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.role).toBe("assistant");
    expect(assistant.id).toBe(serverId);
    expect(assistant.content[0]).toMatchObject({ type: "text", text: "Hello" });
  });

  it("persists assistant history under the server id, not the placeholder", async () => {
    const serverId = "srv-msg-42";
    const append = vi.fn(async () => {});
    const history: ThreadHistoryAdapter = {
      load: async () => null,
      append,
    } as unknown as ThreadHistoryAdapter;

    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onTextMessageStartEvent?.({
          event: { type: "TEXT_MESSAGE_START", messageId: serverId },
        });
        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            messageId: serverId,
            delta: "hi",
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent, { history });
    await core.append(createAppendMessage());

    const assistantAppendCall = append.mock.calls.find(
      ([entry]: [{ message: ThreadMessage }]) =>
        entry.message.role === "assistant",
    );
    expect(assistantAppendCall).toBeDefined();
    expect(assistantAppendCall![0].message.id).toBe(serverId);
  });

  it("stabilizes the assistant id before history.append fires", async () => {
    const append = vi.fn(async () => {});
    const history: ThreadHistoryAdapter = {
      load: async () => null,
      append,
    } as unknown as ThreadHistoryAdapter;

    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onTextMessageContentEvent?.({
          event: { type: "TEXT_MESSAGE_CONTENT", delta: "ok" },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent, { history });
    await core.append(createAppendMessage());

    const assistantAppendCall = append.mock.calls.find(
      ([entry]: [{ message: ThreadMessage }]) =>
        entry.message.role === "assistant",
    );
    expect(assistantAppendCall).toBeDefined();
    expect(
      assistantAppendCall![0].message.id.startsWith("__optimistic__"),
    ).toBe(false);
  });

  it("stabilizes the assistant id at terminal state when no server messageId is provided", async () => {
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onTextMessageContentEvent?.({
          event: { type: "TEXT_MESSAGE_CONTENT", delta: "ok" },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.id.startsWith("__optimistic__")).toBe(false);
    expect(assistant.id.length).toBeGreaterThan(0);
    expect(assistant.status).toMatchObject({ type: "complete" });
  });

  it("routes addToolResult through the server id after id reassignment", async () => {
    const serverId = "srv-with-tools";
    let resumeCalls = 0;
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        resumeCalls += 1;
        if (resumeCalls === 1) {
          subscriber.onTextMessageStartEvent?.({
            event: { type: "TEXT_MESSAGE_START", messageId: serverId },
          });
          subscriber.onToolCallStartEvent?.({
            event: {
              type: "TOOL_CALL_START",
              toolCallId: "tc-9",
              toolCallName: "lookup",
              parentMessageId: serverId,
            },
          });
          subscriber.onToolCallEndEvent?.({
            event: { type: "TOOL_CALL_END", toolCallId: "tc-9" },
          });
        }
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    const assistantBeforeResult = core
      .getMessages()
      .find((m) => m.id === serverId) as ThreadAssistantMessage | undefined;
    expect(assistantBeforeResult?.id).toBe(serverId);

    core.addToolResult({
      messageId: serverId,
      toolCallId: "tc-9",
      toolName: "lookup",
      result: { ok: true },
      isError: false,
    });

    const updatedAssistant = core
      .getMessages()
      .find((m) => m.id === serverId) as ThreadAssistantMessage;
    const toolPart = updatedAssistant.content.find(
      (part) => part.type === "tool-call",
    ) as any;
    expect(toolPart.result).toEqual({ ok: true });
  });

  it("stabilizes the assistant id before addToolResult forwards to history", async () => {
    const append = vi.fn(async () => {});
    const history: ThreadHistoryAdapter = {
      load: async () => null,
      append,
    } as unknown as ThreadHistoryAdapter;

    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onToolCallStartEvent?.({
          event: {
            type: "TOOL_CALL_START",
            toolCallId: "tc-leaky",
            toolCallName: "lookup",
          },
        });
        subscriber.onToolCallEndEvent?.({
          event: { type: "TOOL_CALL_END", toolCallId: "tc-leaky" },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent, { history });
    await core.append(createAppendMessage());

    const assistant = core
      .getMessages()
      .findLast((m) => m.role === "assistant") as ThreadAssistantMessage;
    expect(assistant.id.startsWith("__optimistic__")).toBe(false);

    core.addToolResult({
      messageId: assistant.id,
      toolCallId: "tc-leaky",
      toolName: "lookup",
      result: { ok: true },
      isError: false,
    });

    const assistantAppendCall = append.mock.calls.find(
      ([entry]: [{ message: ThreadMessage }]) =>
        entry.message.role === "assistant",
    );
    expect(assistantAppendCall).toBeDefined();
    expect(
      assistantAppendCall![0].message.id.startsWith("__optimistic__"),
    ).toBe(false);
  });

  it("drops the optimistic placeholder when the server id collides with an existing message", async () => {
    const serverId = "srv-collision";
    const existingMessage: ThreadAssistantMessage = {
      id: serverId,
      role: "assistant",
      createdAt: new Date(),
      status: { type: "complete", reason: "unknown" },
      content: [{ type: "text", text: "from history" }],
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };

    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onTextMessageStartEvent?.({
          event: { type: "TEXT_MESSAGE_START", messageId: serverId },
        });
        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            messageId: serverId,
            delta: "streaming",
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    core.applyExternalMessages([existingMessage as ThreadMessage]);
    await core.append(createAppendMessage());

    const collidedMessages = core
      .getMessages()
      .filter((m) => m.id === serverId);
    expect(collidedMessages).toHaveLength(1);
    const optimisticLingerers = core
      .getMessages()
      .filter((m) => m.id.startsWith("__optimistic__"));
    expect(optimisticLingerers).toHaveLength(0);
  });

  it("marks the placeholder as optimistic and clears the flag once the server id arrives", async () => {
    const serverId = "srv-optimistic-flag";
    let midRunAssistant: ThreadAssistantMessage | undefined;
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onTextMessageContentEvent?.({
          event: { type: "TEXT_MESSAGE_CONTENT", delta: "partial" },
        });
        midRunAssistant = core.getMessages().at(-1) as ThreadAssistantMessage;
        subscriber.onTextMessageStartEvent?.({
          event: { type: "TEXT_MESSAGE_START", messageId: serverId },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    expect(midRunAssistant?.id.startsWith("__optimistic__")).toBe(true);
    expect(midRunAssistant?.metadata.isOptimistic).toBe(true);

    const assistant = core
      .getMessages()
      .find((m) => m.id === serverId) as ThreadAssistantMessage;
    expect(assistant).toBeDefined();
    expect(assistant.metadata.isOptimistic).toBeUndefined();
  });

  it("clears the optimistic flag when the id stabilizes without a server id", async () => {
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onTextMessageContentEvent?.({
          event: { type: "TEXT_MESSAGE_CONTENT", delta: "ok" },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.id.startsWith("__optimistic__")).toBe(false);
    expect(assistant.metadata.isOptimistic).toBeUndefined();
  });
});
