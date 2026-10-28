// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCompletedTurnEvents,
  createEveSessionFixture,
} from "./testUtils";
import { useEveAgentRuntime } from "./useEveAgentRuntime";

const knownTurn = createCompletedTurnEvents({
  turnId: "t1",
  text: "hi",
  reply: "hello",
});
const outOfBandTurn = createCompletedTurnEvents({
  turnId: "t2",
  text: "answered elsewhere",
  reply: "done",
  startLine: knownTurn.length,
  follows: "t1",
});

afterEach(() => vi.unstubAllGlobals());

describe("useEveAgentRuntime against a durable eve session", () => {
  it("surfaces a turn the server appended out of band after reloadMainThread", async () => {
    const { fetch, session } = createEveSessionFixture({
      events: outOfBandTurn,
      tailIndex: knownTurn.length + outOfBandTurn.length - 1,
    });

    const { result } = renderHook(() =>
      useEveAgentRuntime({ initialEvents: knownTurn, session }),
    );
    expect(
      result.current.thread.getState().messages.map((m) => m.role),
    ).toEqual(["user", "assistant"]);

    await act(async () => {
      await result.current.threads.reloadMainThread();
    });

    expect(fetch).toHaveBeenCalled();
    expect(
      fetch.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(0);
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
