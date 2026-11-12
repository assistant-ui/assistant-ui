// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { HttpAgent } from "@ag-ui/client";
import { afterEach, expect, it, vi } from "vitest";
import { AgUiThreadController } from "./runtime/AgUiThreadController";
import type { AgUiSubscriber } from "./runtime/adapter/subscriber";
import { makeLogger } from "./runtime/logger";
import { useAgUiRuntime } from "./useAgUiRuntime";

afterEach(cleanup);

it("exposes the deprecated interrupt methods on the runtime facade", () => {
  const agent = {
    runAgent: vi.fn(),
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  const { result } = renderHook(() => useAgUiRuntime({ agent }));

  expect(Object.hasOwn(result.current, "unstable_getPendingInterrupts")).toBe(
    true,
  );
  expect(
    Object.hasOwn(result.current, "unstable_submitInterruptResponses"),
  ).toBe(true);
  expect(result.current.unstable_getPendingInterrupts()).toEqual([]);
  expect(result.current.unstable_submitInterruptResponses).toEqual(
    expect.any(Function),
  );
});

it("re-renders when the core publishes a state change", () => {
  const agent = {
    runAgent: vi.fn(),
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  let renders = 0;
  const { result } = renderHook(() => {
    renders++;
    return useAgUiRuntime({ agent });
  });
  const initialRenders = renders;

  act(() => {
    result.current.thread.append({
      role: "user",
      content: [{ type: "text", text: "hello" }],
      startRun: false,
    });
  });

  expect(renders).toBeGreaterThan(initialRenders);
  expect(result.current.thread.getState().messages).toHaveLength(1);
});

it("passes joinStrategy to the active run", async () => {
  const agent = {
    runAgent: vi.fn(async (_input: unknown, subscriber: any) => {
      for (const [messageId, delta] of [
        ["a", "A"],
        ["b", "B"],
      ]) {
        subscriber.onTextMessageStartEvent?.({
          event: { type: "TEXT_MESSAGE_START", messageId },
        });
        subscriber.onTextMessageContentEvent?.({
          event: { type: "TEXT_MESSAGE_CONTENT", messageId, delta },
        });
      }
      subscriber.onRunFinalized?.();
    }),
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  const { result } = renderHook(() =>
    useAgUiRuntime({ agent, joinStrategy: "concat-content" }),
  );

  await act(async () => {
    await result.current.thread.append({
      role: "user",
      content: [{ type: "text", text: "hi" }],
    });
  });

  const assistants = result.current.thread
    .getState()
    .messages.filter((message) => message.role === "assistant");
  expect(assistants).toHaveLength(1);
  expect(assistants[0]?.content).toMatchObject([
    { type: "text", text: "A" },
    { type: "text", text: "B" },
  ]);
});

it("batches text deltas emitted from one response before re-rendering the host", async () => {
  const deltas = Array.from({ length: 20 }, (_, index) => String(index));
  const events = [
    { type: "RUN_STARTED", threadId: "main", runId: "run" },
    { type: "TEXT_MESSAGE_START", messageId: "answer" },
    ...deltas.map((delta) => ({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "answer",
      delta,
    })),
    { type: "TEXT_MESSAGE_END", messageId: "answer" },
    { type: "RUN_FINISHED", threadId: "main", runId: "run" },
  ];
  const agent = new HttpAgent({
    url: "http://agent.test/agent",
    fetch: async () =>
      new Response(
        events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
        { headers: { "content-type": "text/event-stream" } },
      ),
  });
  let renders = 0;
  const { result } = renderHook(() => {
    renders++;
    return useAgUiRuntime({ agent });
  });

  const baseline = renders;
  const pending = result.current.thread.append({
    role: "user",
    content: [{ type: "text", text: "go" }],
  });
  await pending;
  await new Promise((resolve) => setTimeout(resolve, 0));

  const assistant = result.current.thread
    .getState()
    .messages.find((message) => message.role === "assistant");
  expect(assistant).toMatchObject({
    content: [{ type: "text", text: deltas.join("") }],
    status: { type: "complete" },
  });
  expect(renders - baseline).toBeLessThanOrEqual(6);
});

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
