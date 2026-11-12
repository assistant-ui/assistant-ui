import type { HttpAgent } from "@ag-ui/client";
import { expect, it, vi } from "vitest";
import { AgUiThreadController } from "./AgUiThreadController";
import type { AgUiSubscriber } from "./adapter/subscriber";
import { makeLogger } from "./logger";

it("notifies subscribers synchronously when a delta callback cancels the run", async () => {
  vi.useFakeTimers();
  let subscriber!: AgUiSubscriber;
  let finishRun!: () => void;
  const agent = {
    runAgent: (_input: unknown, current: AgUiSubscriber) => {
      subscriber = current;
      return new Promise<void>((resolve) => {
        finishRun = resolve;
      });
    },
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  const runningStates: boolean[] = [];
  let runningStatesAtCancelReturn: boolean[] = [];
  const error = vi.fn(() => {
    void controller.cancel();
    runningStatesAtCancelReturn = [...runningStates];
  });
  const controller = new AgUiThreadController({
    agent,
    logger: makeLogger({ error }),
    showThinking: true,
  });
  const pending = controller.reload(null);

  try {
    subscriber.onTextMessageStartEvent?.({
      event: { type: "TEXT_MESSAGE_START", messageId: "answer" },
    });
    controller.subscribe(() => {
      runningStates.push(controller.getSnapshot().isRunning);
    });
    subscriber.onTextMessageContentEvent?.({
      event: {
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "answer",
        delta: "partial",
      },
    });
    expect(runningStates).toEqual([]);
    expect(controller.getSnapshot().isRunning).toBe(true);

    subscriber.onStateDeltaEvent?.({
      event: {
        type: "STATE_DELTA",
        delta: [{ op: "replace", path: "/missing", value: 1 }],
      },
    });

    expect(error).toHaveBeenCalledOnce();
    expect(runningStatesAtCancelReturn.length).toBeGreaterThan(0);
    expect(runningStatesAtCancelReturn.at(-1)).toBe(false);
    expect(controller.getSnapshot().isRunning).toBe(false);
    vi.runAllTimers();
    expect(runningStates).toEqual(runningStatesAtCancelReturn);
  } finally {
    finishRun();
    await pending;
    vi.useRealTimers();
  }
});

it("notifies once for a text delta burst while the stream stays open", async () => {
  vi.useFakeTimers();
  let subscriber!: AgUiSubscriber;
  let finishRun!: () => void;
  const agent = {
    runAgent: (_input: unknown, current: AgUiSubscriber) => {
      subscriber = current;
      return new Promise<void>((resolve) => {
        finishRun = resolve;
      });
    },
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  const controller = new AgUiThreadController({
    agent,
    logger: makeLogger(),
    showThinking: true,
  });
  const pending = controller.reload(null);

  try {
    subscriber.onTextMessageStartEvent?.({
      event: { type: "TEXT_MESSAGE_START", messageId: "answer" },
    });
    const listener = vi.fn(() => controller.getSnapshot());
    controller.subscribe(listener);
    for (const delta of ["hello", " ", "world"]) {
      subscriber.onTextMessageContentEvent?.({
        event: { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta },
      });
    }

    expect(listener).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.results[0]?.value).toMatchObject({
      isRunning: true,
      messageRepository: {
        messages: [
          {
            message: {
              role: "assistant",
              content: [{ type: "text", text: "hello world" }],
              status: { type: "running" },
            },
          },
        ],
      },
    });
    vi.runAllTimers();
    expect(listener).toHaveBeenCalledOnce();
  } finally {
    finishRun();
    await pending;
    vi.useRealTimers();
  }
});
