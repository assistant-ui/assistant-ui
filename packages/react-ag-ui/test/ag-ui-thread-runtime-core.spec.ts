"use client";

import { describe, expect, it, vi } from "vitest";
import type {
  AppendMessage,
  ThreadAssistantMessage,
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
  hooks: { onError?: (e: Error) => void; onCancel?: () => void } = {},
) =>
  new AgUiThreadRuntimeCore({
    agent,
    logger: noopLogger,
    showThinking: true,
    ...(hooks.onError ? { onError: hooks.onError } : {}),
    ...(hooks.onCancel ? { onCancel: hooks.onCancel } : {}),
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
});
