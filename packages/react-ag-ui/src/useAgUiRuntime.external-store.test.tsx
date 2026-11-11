// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { HttpAgent } from "@ag-ui/client";
import { afterEach, expect, it, vi } from "vitest";
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
