// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createEveSessionFixture } from "./testUtils";
import { useEveAgentRuntime } from "./useEveAgentRuntime";

const meta = (second: number) => ({
  at: `2026-01-02T10:00:0${second}.000Z`,
  id: `t1-${second}`,
});

const interruptedTurn = (ending: Record<string, unknown>) => [
  { type: "turn.started", data: { sequence: 1, turnId: "t1" }, meta: meta(0) },
  {
    type: "message.received",
    data: { message: "hi", sequence: 2, turnId: "t1" },
    meta: meta(1),
  },
  {
    type: "step.started",
    data: { modelId: "m", sequence: 3, stepIndex: 0, turnId: "t1" },
    meta: meta(2),
  },
  {
    type: "message.appended",
    data: {
      messageDelta: "Let me th",
      sequence: 4,
      stepIndex: 0,
      turnId: "t1",
    },
    meta: meta(3),
  },
  { ...ending, meta: meta(4) },
];

const renderInterruptedTurn = (ending: Record<string, unknown>) => {
  const { session } = createEveSessionFixture({});
  return renderHook(() =>
    useEveAgentRuntime({
      initialEvents: interruptedTurn(ending) as never,
      session,
    }),
  );
};

afterEach(() => vi.unstubAllGlobals());

describe("useEveAgentRuntime with an interrupted turn", () => {
  it("shows a failed turn's assistant message as an error", async () => {
    const { result } = renderInterruptedTurn({
      type: "turn.failed",
      data: { code: "internal", message: "boom", sequence: 5, turnId: "t1" },
    });

    await waitFor(() =>
      expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
        type: "incomplete",
        reason: "error",
        error: { code: "internal", message: "boom" },
      }),
    );
  });

  it("shows a cancelled turn's assistant message as cancelled", async () => {
    const { result } = renderInterruptedTurn({
      type: "turn.cancelled",
      data: { sequence: 5, turnId: "t1" },
    });

    await waitFor(() =>
      expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
        type: "incomplete",
        reason: "cancelled",
      }),
    );
  });
});
