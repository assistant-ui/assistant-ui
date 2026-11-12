// @vitest-environment jsdom

import { HttpAgent } from "@ag-ui/client";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useAgUiRuntime } from "./useAgUiRuntime";

afterEach(cleanup);

it("sends initialState on the first request and keeps middleware clientContext out of thread.state", async () => {
  const sentStates: unknown[] = [];
  const agent = new HttpAgent({
    url: "http://agent.test/agent",
    initialState: { fromInitialState: true },
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      sentStates.push(body.state);
      const events = [
        { type: "RUN_STARTED", threadId: body.threadId, runId: body.runId },
        { type: "STATE_DELTA", delta: [{ op: "add", path: "/foo", value: 1 }] },
        {
          type: "TEXT_MESSAGE_START",
          messageId: `m-${body.runId}`,
          role: "assistant",
        },
        {
          type: "TEXT_MESSAGE_CONTENT",
          messageId: `m-${body.runId}`,
          delta: "ok",
        },
        { type: "TEXT_MESSAGE_END", messageId: `m-${body.runId}` },
        { type: "RUN_FINISHED", threadId: body.threadId, runId: body.runId },
      ];
      return new Response(
        events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
        { headers: { "content-type": "text/event-stream" } },
      );
    },
  });
  agent.use((input, next) =>
    next.run({ ...input, state: { ...input.state, clientContext: "x" } }),
  );
  const { result } = renderHook(() => useAgUiRuntime({ agent }));
  const { result: otherThread } = renderHook(() => useAgUiRuntime({ agent }));

  expect(result.current.thread.getState().state).toEqual({
    fromInitialState: true,
  });

  for (const text of ["first", "second"]) {
    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text }],
      });
    });
    await waitFor(() =>
      expect(result.current.thread.getState().isRunning).toBe(false),
    );
    expect(otherThread.current.thread.getState().state).toEqual({
      fromInitialState: true,
    });
  }

  expect(sentStates).toEqual([
    { fromInitialState: true, clientContext: "x" },
    { fromInitialState: true, foo: 1, clientContext: "x" },
  ]);
  expect(result.current.thread.getState().state).toEqual({
    fromInitialState: true,
    foo: 1,
  });

  await act(async () => {
    await otherThread.current.thread.append({
      role: "user",
      content: [{ type: "text", text: "other thread" }],
    });
  });
  await waitFor(() =>
    expect(otherThread.current.thread.getState().isRunning).toBe(false),
  );
  expect(sentStates[2]).toEqual({
    fromInitialState: true,
    clientContext: "x",
  });
});
