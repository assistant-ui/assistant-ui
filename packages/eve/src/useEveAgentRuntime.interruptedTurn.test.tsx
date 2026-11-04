// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import type { SessionEvent } from "eve/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEveEvents, createEveSessionFixture } from "./testUtils";
import { useEveAgentRuntime } from "./useEveAgentRuntime";

const renderInterruptedTurn = (
  ending: Extract<SessionEvent, { type: "turn.settled" }>["data"],
) => {
  const at = "2026-01-02T10:00:00.000Z";
  const events = createEveEvents([
    { at, event: { type: "session.started", data: {} } },
    {
      at,
      event: { type: "delivery.admitted", data: { deliveryId: "d1" } },
    },
    {
      at,
      event: {
        type: "turn.started",
        data: { turnId: "t1", cause: { deliveryId: "d1" }, follows: null },
      },
    },
    {
      at,
      event: {
        type: "delivery.consumed",
        data: {
          deliveryId: "d1",
          turnId: "t1",
          parts: [{ kind: "text", text: "hi" }],
        },
      },
    },
    {
      at,
      event: {
        type: "model.requested",
        data: { runId: "r1", owner: { turnId: "t1" } },
        scope: { turnId: "t1" },
      },
    },
    {
      at,
      event: {
        type: "model.started",
        data: { runId: "r1", modelId: "m", attempt: 0 },
        scope: { turnId: "t1", runId: "r1" },
      },
    },
    {
      at,
      event: {
        type: "content.completed",
        data: {
          partId: "p1",
          runId: "r1",
          kind: "text",
          value: "Let me th",
          phase: "reply",
          interrupted: true,
        },
        scope: { turnId: "t1", runId: "r1" },
      },
    },
    {
      at,
      event: {
        type: "model.settled",
        data: { runId: "r1", outcome: "interrupted" },
        scope: { turnId: "t1", runId: "r1" },
      },
    },
    {
      at,
      event: { type: "turn.settled", data: ending, scope: { turnId: "t1" } },
    },
    {
      at,
      event: {
        type: "delivery.settled",
        data: { deliveryId: "d1", turnId: "t1", outcome: "handled" },
      },
    },
  ] satisfies readonly { at: string; event: SessionEvent }[]);
  const { session } = createEveSessionFixture({});
  return renderHook(() =>
    useEveAgentRuntime({ initialEvents: events, session }),
  );
};

afterEach(() => vi.unstubAllGlobals());

describe("useEveAgentRuntime with an interrupted turn", () => {
  it("shows a failed turn's assistant message as an error", async () => {
    const { result } = renderInterruptedTurn({
      turnId: "t1",
      outcome: "failed",
      error: { code: "internal", message: "boom" },
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
      turnId: "t1",
      outcome: "cancelled",
    });

    await waitFor(() =>
      expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
        type: "incomplete",
        reason: "cancelled",
      }),
    );
  });
});
