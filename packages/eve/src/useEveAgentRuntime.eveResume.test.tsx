// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MessageStreamEvent } from "eve/client";

import { createEveSessionFixture } from "./testUtils";
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

const NEXT_TURN = "turn_next";

const nextTurnEvents = [
  {
    type: "turn.started",
    data: { sequence: 7, turnId: NEXT_TURN },
    meta: { at: "2026-01-02T10:03:00.000Z", id: "evt_201" },
  },
  {
    type: "message.received",
    data: { message: "follow up", sequence: 8, turnId: NEXT_TURN },
    meta: {
      at: "2026-01-02T10:03:01.000Z",
      id: "evt_202",
      deliveryIds: ["delivery_1"],
    },
  },
  {
    type: "step.started",
    data: {
      modelId: "test-model",
      sequence: 9,
      stepIndex: 0,
      turnId: NEXT_TURN,
    },
    meta: { at: "2026-01-02T10:03:02.000Z", id: "evt_203" },
  },
  {
    type: "message.completed",
    data: {
      finishReason: "stop",
      message: "noted",
      sequence: 10,
      stepIndex: 0,
      turnId: NEXT_TURN,
    },
    meta: { at: "2026-01-02T10:03:03.000Z", id: "evt_204" },
  },
  {
    type: "turn.completed",
    data: { sequence: 11, turnId: NEXT_TURN },
    meta: { at: "2026-01-02T10:03:04.000Z", id: "evt_205" },
  },
  {
    type: "session.waiting",
    data: { continuationToken: "session_resumed", wait: "next-user-message" },
    meta: { at: "2026-01-02T10:03:05.000Z", id: "evt_206" },
  },
] as const satisfies readonly MessageStreamEvent[];

const parkedEvents = [
  ...resumedEvents,
  {
    type: "session.waiting",
    data: { continuationToken: "session_resumed", wait: "next-user-message" },
    meta: { at: "2026-01-02T10:02:08.000Z", id: "evt_005" },
  },
] as const satisfies readonly MessageStreamEvent[];

const copyEvents = (events: readonly MessageStreamEvent[]) =>
  JSON.parse(JSON.stringify(events)) as readonly MessageStreamEvent[];

afterEach(() => vi.unstubAllGlobals());

describe("useEveAgentRuntime against a resumed eve session", () => {
  it("renders resumed history at its durable event times, not the current time", async () => {
    const { session } = createEveSessionFixture({ events: resumedEvents });
    const { result } = renderHook(() =>
      useEveAgentRuntime({ resume: true, session }),
    );

    await waitFor(() =>
      expect(result.current.thread.getState().messages).toHaveLength(2),
    );

    const messages = result.current.thread.getState().messages;
    expect(messages[0]?.createdAt).toEqual(new Date(USER_AT));
    expect(messages[1]?.createdAt).toEqual(new Date(ASSISTANT_AT));
  });

  it("reports the replay as loading and holds a send typed during it until the replay ends", async () => {
    const { fetch, push, session } = createEveSessionFixture({
      tailIndex: parkedEvents.length - 1,
      onSend: () => setTimeout(() => push(copyEvents(nextTurnEvents)), 0),
    });

    const { result } = renderHook(() =>
      useEveAgentRuntime({ resume: true, session }),
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(result.current.thread.getState().isLoading).toBe(true);

    act(() => result.current.thread.append("follow up"));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(fetch).toHaveBeenCalledOnce();

    await act(async () => {
      push(copyEvents(parkedEvents));
    });

    await waitFor(() =>
      expect(result.current.thread.getState().messages).toHaveLength(4),
    );
    expect(
      fetch.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    expect(result.current.thread.getState().isLoading).toBe(false);
  });
});
