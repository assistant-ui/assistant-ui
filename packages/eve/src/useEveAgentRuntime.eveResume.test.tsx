// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCompletedTurnEvents,
  createEveSessionFixture,
} from "./testUtils";
import { useEveAgentRuntime } from "./useEveAgentRuntime";

const USER_AT = "2026-01-02T10:00:01.000Z";
const ASSISTANT_AT = "2026-01-02T10:02:00.000Z";
const resumedEvents = createCompletedTurnEvents({
  turnId: "turn_resumed",
  text: "hi",
  reply: "hello",
  userAt: USER_AT,
  assistantAt: ASSISTANT_AT,
});
const nextTurnEvents = createCompletedTurnEvents({
  turnId: "turn_next",
  text: "follow up",
  reply: "next answer",
  startLine: resumedEvents.length,
  follows: "turn_resumed",
  deliveryId: "delivery_1",
});

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
      tailIndex: resumedEvents.length - 1,
      onSend: () => setTimeout(() => push(nextTurnEvents), 0),
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
      push(resumedEvents);
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
