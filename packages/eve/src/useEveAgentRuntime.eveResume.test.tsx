// @vitest-environment jsdom

// Deliberately does not mock `eve/react`: the real `useEveAgent` resumes an
// offline session so the durable `meta.at` values travel through eve's own
// store and reducer before the adapter reads them. Supplying `session` keeps
// the store from constructing a network client.

import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MessageStreamEvent } from "eve/client";

import { useEveAgentRuntime } from "./useEveAgentRuntime";

const TURN = "turn_resumed";

const USER_AT = "2026-01-02T10:00:01.000Z";
const ASSISTANT_AT = "2026-01-02T10:02:00.000Z";

const resumedEvents = [
  {
    type: "turn.started",
    data: { sequence: 1, turnId: TURN },
    meta: { at: "2026-01-02T10:00:00.000Z", id: "evt_001" },
  },
  {
    type: "message.received",
    data: { message: "hi", sequence: 2, turnId: TURN },
    meta: { at: USER_AT, id: "evt_101" },
  },
  {
    type: "step.started",
    data: { modelId: "test-model", sequence: 3, stepIndex: 0, turnId: TURN },
    meta: { at: ASSISTANT_AT, id: "evt_102" },
  },
  {
    type: "message.completed",
    data: {
      finishReason: "stop",
      message: "hello",
      sequence: 5,
      stepIndex: 0,
      turnId: TURN,
    },
    meta: { at: "2026-01-02T10:02:06.000Z", id: "evt_003" },
  },
  {
    type: "turn.completed",
    data: { sequence: 6, turnId: TURN },
    meta: { at: "2026-01-02T10:02:07.000Z", id: "evt_004" },
  },
] as const satisfies readonly MessageStreamEvent[];

const offlineSession = {
  state: { sessionId: "session_resumed", streamIndex: 0 },
  cancel: async () => ({ status: "no_active_turn" }),
  send: () => {
    throw new Error("the resume test must not reach the network");
  },
  stream: async function* () {
    yield* JSON.parse(
      JSON.stringify(resumedEvents),
    ) as readonly MessageStreamEvent[];
  },
} as never;

describe("useEveAgentRuntime against a resumed eve session", () => {
  it("renders resumed history at its durable event times, not the current time", async () => {
    const { result } = renderHook(() =>
      useEveAgentRuntime({ resume: true, session: offlineSession }),
    );

    await waitFor(() =>
      expect(result.current.thread.getState().messages).toHaveLength(2),
    );

    const messages = result.current.thread.getState().messages;
    expect(messages[0]?.createdAt).toEqual(new Date(USER_AT));
    expect(messages[1]?.createdAt).toEqual(new Date(ASSISTANT_AT));
  });
});
