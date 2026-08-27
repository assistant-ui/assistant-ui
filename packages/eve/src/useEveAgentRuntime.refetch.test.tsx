// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HandleMessageStreamEvent } from "eve/client";

import { useEveAgentRuntime } from "./useEveAgentRuntime";

const completedTurn = (
  turnId: string,
  text: string,
  reply: string,
  sequence: number,
) =>
  [
    {
      type: "turn.started",
      data: { sequence, turnId },
      meta: { at: "2026-01-02T10:00:00.000Z", id: `${turnId}-1` },
    },
    {
      type: "message.received",
      data: { message: text, sequence: sequence + 1, turnId },
      meta: { at: "2026-01-02T10:00:01.000Z", id: `${turnId}-2` },
    },
    {
      type: "step.started",
      data: { modelId: "m", sequence: sequence + 2, stepIndex: 0, turnId },
      meta: { at: "2026-01-02T10:00:02.000Z", id: `${turnId}-3` },
    },
    {
      type: "message.completed",
      data: {
        finishReason: "stop",
        message: reply,
        sequence: sequence + 3,
        stepIndex: 0,
        turnId,
      },
      meta: { at: "2026-01-02T10:00:03.000Z", id: `${turnId}-4` },
    },
    {
      type: "turn.completed",
      data: { sequence: sequence + 4, turnId },
      meta: { at: "2026-01-02T10:00:04.000Z", id: `${turnId}-5` },
    },
  ] as const satisfies readonly HandleMessageStreamEvent[];

const knownTurn = completedTurn("t1", "hi", "hello", 1);
const outOfBandTurn = completedTurn("t2", "answered elsewhere", "done", 6);

describe("useEveAgentRuntime against a durable eve session", () => {
  it("surfaces a turn the server appended out of band after reloadMainThread", async () => {
    const stream = vi.fn(async function* () {
      yield* [...knownTurn, ...outOfBandTurn];
    });
    const session = {
      state: { sessionId: "s1" },
      stream,
      send: () => {
        throw new Error("the refetch test must not send");
      },
    } as never;

    const { result } = renderHook(() =>
      useEveAgentRuntime({ initialEvents: knownTurn as never, session }),
    );
    expect(
      result.current.thread.getState().messages.map((m) => m.role),
    ).toEqual(["user", "assistant"]);

    await act(async () => {
      await result.current.threads.reloadMainThread();
    });

    expect(stream).toHaveBeenCalled();
    const messages = result.current.thread.getState().messages;
    expect(messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(messages[3]?.content).toMatchObject([
      { type: "text", text: "done" },
    ]);
    expect(result.current.thread.getState().isRunning).toBe(false);
  });
});
