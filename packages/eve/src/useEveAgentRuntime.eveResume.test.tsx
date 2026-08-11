// @vitest-environment jsdom

// This suite deliberately does not mock `eve/react`. It drives the real
// `useEveAgent` from the installed eve release against a resumed event log, so
// the durable `meta.at` values travel through eve's own store and reducer
// before the adapter derives `createdAt` from them. That is the part a mocked
// seam cannot establish: that eve replay actually exposes the historical
// events, with their original timestamps, on `agent.events`.
//
// `session` is supplied, so the store never constructs a `Client` and no
// network call is reachable from this test.

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HandleMessageStreamEvent } from "eve/client";
import { useEveAgent } from "eve/react";

import { useEveAgentRuntime } from "./useEveAgentRuntime";

const TURN = "turn_resumed";

// The user asked yesterday; the model answered two minutes later.
const USER_AT = "2026-01-02T10:00:01.000Z";
const ASSISTANT_AT = "2026-01-02T10:02:00.000Z";

const resumedEvents = [
  {
    type: "turn.started",
    data: { sequence: 1, turnId: TURN },
    meta: { at: "2026-01-02T10:00:00.000Z" },
  },
  {
    type: "message.received",
    data: { message: "hi", sequence: 2, turnId: TURN },
    meta: { at: USER_AT },
  },
  {
    type: "step.started",
    data: { sequence: 3, stepIndex: 0, turnId: TURN },
    meta: { at: ASSISTANT_AT },
  },
  {
    type: "message.appended",
    data: {
      messageDelta: "hello",
      messageSoFar: "hello",
      sequence: 4,
      stepIndex: 0,
      turnId: TURN,
    },
    meta: { at: "2026-01-02T10:02:05.000Z" },
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
    meta: { at: "2026-01-02T10:02:06.000Z" },
  },
  {
    type: "turn.completed",
    data: { sequence: 6, turnId: TURN },
    meta: { at: "2026-01-02T10:02:07.000Z" },
  },
] as const satisfies readonly HandleMessageStreamEvent[];

// An external session keeps the store from creating a network client. It is
// never sent to: the test only resumes.
const offlineSession = {
  state: { sessionId: "session_resumed" },
  send: () => {
    throw new Error("the resume test must not reach the network");
  },
} as never;

describe("useEveAgentRuntime against a resumed eve session", () => {
  it("renders resumed history at its durable event times, not the current time", () => {
    const renderedAt = Date.now();

    const { result } = renderHook(() =>
      useEveAgentRuntime({
        initialEvents: resumedEvents as never,
        session: offlineSession,
      }),
    );

    const messages = result.current.thread.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe("user");
    expect(messages[1]?.role).toBe("assistant");

    expect(messages[0]?.createdAt).toEqual(new Date(USER_AT));
    expect(messages[1]?.createdAt).toEqual(new Date(ASSISTANT_AT));

    // The defect this PR fixes: without durable derivation both messages are
    // stamped at first observation, which is render time.
    for (const message of messages) {
      expect(message.createdAt.getTime()).toBeLessThan(renderedAt);
    }
  });

  // The load-bearing upstream assumption of this PR: the adapter reads
  // `agent.events`, so eve must hand a resumed log back with its persisted
  // timestamps intact rather than restamping on replay.
  it("exposes the durable meta.at of every resumed event through agent.events", () => {
    const { result } = renderHook(() =>
      useEveAgent({
        initialEvents: resumedEvents as never,
        session: offlineSession,
      }),
    );

    expect(result.current.events.map((event) => event.meta?.at)).toEqual(
      resumedEvents.map((event) => event.meta.at),
    );
  });

  // The turn's messages come from eve's own reducer, so the ids and
  // `metadata.turnId` the adapter keys on are eve's, not the test's.
  it("resumes both messages of the turn with eve's own turn metadata", () => {
    const { result } = renderHook(() =>
      useEveAgent({
        initialEvents: resumedEvents as never,
        session: offlineSession,
      }),
    );

    expect(
      result.current.data.messages.map((message) => ({
        id: message.id,
        role: message.role,
        turnId: message.metadata?.turnId,
      })),
    ).toEqual([
      { id: `${TURN}:user`, role: "user", turnId: TURN },
      { id: `${TURN}:assistant`, role: "assistant", turnId: TURN },
    ]);
  });
});
