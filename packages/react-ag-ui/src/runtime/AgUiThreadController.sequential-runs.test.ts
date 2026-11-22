import { agUiWireMessageId } from "./adapter/conversions";
import { describe, expect, it, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type { AppendMessage } from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import type { AgUiSubscriber } from "./adapter/subscriber";
import { makeLogger } from "./logger";

const userMessage = (text: string, parentId: string | null): AppendMessage => ({
  parentId,
  sourceId: null,
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(0),
  runConfig: {},
});

function openResponse() {
  let close!: () => void;
  let closeNext!: () => void;
  let subscriber!: AgUiSubscriber;
  const closed = new Promise<void>((resolve) => {
    close = resolve;
  });
  const nextClosed = new Promise<void>((resolve) => {
    closeNext = resolve;
  });
  const signals: AbortSignal[] = [];
  const runAgent = vi.fn(
    async (
      _input: { messages: unknown[] },
      nextSubscriber: AgUiSubscriber,
      { signal }: { signal: AbortSignal },
    ) => {
      signals.push(signal);
      if (runAgent.mock.calls.length === 1) {
        subscriber = nextSubscriber;
        await closed;
      } else {
        await nextClosed;
      }
    },
  );
  const abortRun = vi.fn();
  const onError = vi.fn();
  const onCancel = vi.fn();
  const core = new AgUiThreadController({
    agent: { runAgent, abortRun } as unknown as AbstractAgent,
    logger: makeLogger(),
    showThinking: false,
    onError,
    onCancel,
  });
  const first = core.append(userMessage("question", null));
  const start = () => subscriber.onRunStartedEvent?.();
  const content = (messageId: string, delta: string) =>
    subscriber.onTextMessageContentEvent?.({
      event: { type: "TEXT_MESSAGE_CONTENT", messageId, delta },
    });
  const end = (messageId: string) =>
    subscriber.onTextMessageEndEvent?.({
      event: { type: "TEXT_MESSAGE_END", messageId },
    });
  const text = (messageId: string, value: string) => {
    subscriber.onTextMessageStartEvent?.({
      event: { type: "TEXT_MESSAGE_START", messageId },
    });
    content(messageId, value);
  };
  const finish = () =>
    subscriber.onRunFinishedEvent?.({
      event: { type: "RUN_FINISHED", runId: "run" },
    });
  start();
  text("first-answer", "first answer");
  end("first-answer");
  subscriber.onStateSnapshotEvent?.({
    event: { type: "STATE_SNAPSHOT", snapshot: { count: 1 } },
  });
  finish();
  return {
    core,
    first,
    subscriber,
    start,
    text,
    content,
    end,
    finish,
    close,
    closeNext,
    runAgent,
    abortRun,
    signals,
    onError,
    onCancel,
  };
}

describe("AgUiThreadController sequential runs during response cleanup", () => {
  it.each(["interrupt", "error"] as const)(
    "ignores a sequential run ending with %s that starts after a send is waiting on the drain",
    async (terminal) => {
      const response = openResponse();
      const { core, subscriber } = response;
      expect(core.isRunning()).toBe(false);
      const sending = core.append(userMessage("follow-up", "first-answer"));
      const expectedMessages = [
        { role: "user", content: [{ type: "text", text: "question" }] },
        {
          role: "assistant",
          content: [{ type: "text", text: "first answer" }],
        },
        { role: "user", content: [{ type: "text", text: "follow-up" }] },
      ];
      const running: boolean[] = [];
      const unsubscribe = core.subscribe(() => running.push(core.isRunning()));
      try {
        response.start();
        response.text("ignored-answer", "ignored answer");
        response.end("ignored-answer");
        subscriber.onToolCallStartEvent?.({
          event: {
            type: "TOOL_CALL_START",
            toolCallId: "ignored-call",
            toolCallName: "lookup",
          },
        });
        subscriber.onToolCallArgsEvent?.({
          event: {
            type: "TOOL_CALL_ARGS",
            toolCallId: "ignored-call",
            delta: "{}",
          },
        });
        subscriber.onToolCallEndEvent?.({
          event: { type: "TOOL_CALL_END", toolCallId: "ignored-call" },
        });
        subscriber.onStateSnapshotEvent?.({
          event: { type: "STATE_SNAPSHOT", snapshot: { count: 99 } },
        });
        if (terminal === "interrupt") {
          subscriber.onRunFinishedEvent?.({
            event: {
              type: "RUN_FINISHED",
              runId: "ignored-run",
              outcome: {
                type: "interrupt",
                interrupts: [{ id: "ignored-gate", reason: "confirm" }],
              },
            },
          });
        } else {
          subscriber.onRunErrorEvent?.({
            event: { type: "RUN_ERROR", message: "ignored error" },
          });
        }
        expect(
          core.getMessages().map(({ role, content }) => ({ role, content })),
        ).toEqual(expectedMessages);
        expect(core.isRunning()).toBe(true);
        expect(response.runAgent).toHaveBeenCalledOnce();
        response.close();
        await response.first;
        expect(
          core
            .getMessages()
            .filter(({ metadata }) => !metadata.isOptimistic)
            .map(({ role, content }) => ({ role, content })),
        ).toEqual(expectedMessages);
        expect(core.getState()).toEqual({ count: 1 });
        expect(core.getPendingToolCalls()).toBeNull();
        expect(core.getPendingInterrupts()).toBeNull();
        expect(running).not.toContain(false);
        expect(core.isRunning()).toBe(true);
        expect(response.runAgent).toHaveBeenCalledTimes(2);
        expect(response.runAgent.mock.calls[1]?.[0].messages).toEqual([
          expect.objectContaining({ role: "user", content: "question" }),
          expect.objectContaining({
            role: "assistant",
            content: "first answer",
          }),
          expect.objectContaining({ role: "user", content: "follow-up" }),
        ]);
        expect(response.signals[0]?.aborted).toBe(false);
        expect(response.abortRun).not.toHaveBeenCalled();
        expect(response.onCancel).not.toHaveBeenCalled();
        expect(response.onError).not.toHaveBeenCalled();
      } finally {
        unsubscribe();
        response.close();
        response.closeNext();
        await Promise.all([response.first, sending]);
      }
      expect(response.runAgent).toHaveBeenCalledTimes(2);
    },
  );

  it("finishes an accepted sequential run when a send arrives midstream", async () => {
    const response = openResponse();
    const { core } = response;
    response.start();
    response.text("second-answer", "second");
    const sending = core.append(userMessage("follow-up", "second-answer"));
    try {
      response.content("second-answer", " answer");
      expect(
        core
          .getMessages()
          .find((message) => agUiWireMessageId(message) === "second-answer")
          ?.content,
      ).toEqual([{ type: "text", text: "second answer" }]);
      response.end("second-answer");
      response.finish();
      expect(core.isRunning()).toBe(true);
      expect(response.runAgent).toHaveBeenCalledOnce();
      expect(response.signals[0]?.aborted).toBe(false);
      expect(response.abortRun).not.toHaveBeenCalled();

      response.close();
      await response.first;
      expect(response.runAgent).toHaveBeenCalledTimes(2);
      expect(
        core
          .getMessages()
          .map((message) => agUiWireMessageId(message))
          .slice(1, 3),
      ).toEqual(["first-answer", "second-answer"]);
      expect(
        core
          .getMessages()
          .find((message) => agUiWireMessageId(message) === "second-answer"),
      ).toMatchObject({
        content: [{ type: "text", text: "second answer" }],
        status: { type: "complete" },
      });
      expect(
        core
          .getMessages()
          .filter(({ metadata }) => !metadata.isOptimistic)
          .map(({ role, content }) => ({ role, content })),
      ).toEqual([
        { role: "user", content: [{ type: "text", text: "question" }] },
        {
          role: "assistant",
          content: [{ type: "text", text: "first answer" }],
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "second answer" }],
        },
        { role: "user", content: [{ type: "text", text: "follow-up" }] },
      ]);
      expect(core.isRunning()).toBe(true);
      expect(response.onCancel).not.toHaveBeenCalled();
    } finally {
      response.close();
      response.closeNext();
      await Promise.all([response.first, sending]);
    }
    expect(response.runAgent).toHaveBeenCalledTimes(2);
  });
});
