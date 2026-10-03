// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createEveSessionFixture } from "./testUtils";
import { useEveAgentRuntime } from "./useEveAgentRuntime";

const meta = (second: number) => ({
  at: `2026-01-02T10:00:0${second}.000Z`,
  id: `t1-${second}`,
});

const failedTurn = [
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
  {
    type: "turn.failed",
    data: { code: "internal", message: "boom", sequence: 5, turnId: "t1" },
    meta: meta(4),
  },
];

afterEach(() => vi.unstubAllGlobals());

describe("useEveAgentRuntime with a failed turn", () => {
  it("shows the failed turn's assistant message as an error", async () => {
    const { session } = createEveSessionFixture({});
    const { result } = renderHook(() =>
      useEveAgentRuntime({ initialEvents: failedTurn as never, session }),
    );

    await waitFor(() =>
      expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
        type: "incomplete",
        reason: "error",
        error: { code: "internal", message: "boom" },
      }),
    );
  });
});
