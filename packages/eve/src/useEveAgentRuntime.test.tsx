// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { mockUseEveAgent } = vi.hoisted(() => ({
  mockUseEveAgent: vi.fn(),
}));

vi.mock("eve/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("eve/react")>()),
  useEveAgent: mockUseEveAgent,
}));

import type { EveMessageData } from "eve/react";
import { useEveAgentRuntime } from "./useEveAgentRuntime";

const stuckStreamingData: EveMessageData = {
  messages: [
    { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
    {
      id: "a1",
      role: "assistant",
      metadata: { status: "streaming" },
      parts: [{ type: "text", text: "Let me th" }],
    },
  ],
};

const createAgent = (overrides: Record<string, unknown>) => ({
  data: stuckStreamingData,
  error: undefined,
  events: [],
  session: undefined,
  status: "ready",
  send: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});

describe("useEveAgentRuntime status forwarding", () => {
  it("maps the session error onto the interrupted assistant message", () => {
    mockUseEveAgent.mockReturnValue(
      createAgent({ status: "error", error: new Error("boom") }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: { code: "unknown", message: "boom" },
    });
  });

  it("settles an aborted turn to cancelled once the agent is idle", () => {
    mockUseEveAgent.mockReturnValue(createAgent({ status: "ready" }) as never);

    const { result } = renderHook(() => useEveAgentRuntime());

    expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("recomputes statuses when only the session error changes", () => {
    const idle = createAgent({ status: "ready" });
    mockUseEveAgent.mockReturnValue(idle as never);

    const { result, rerender } = renderHook(() => useEveAgentRuntime());

    expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });

    mockUseEveAgent.mockReturnValue({
      ...idle,
      status: "error",
      error: new Error("boom"),
    } as never);
    rerender();

    expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: { code: "unknown", message: "boom" },
    });
  });

  it("keeps the last assistant message running while streaming", () => {
    mockUseEveAgent.mockReturnValue(
      createAgent({ status: "streaming" }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
      type: "running",
    });
  });
});

describe("useEveAgentRuntime createdAt derivation", () => {
  const resumedData: EveMessageData = {
    messages: [
      {
        id: "turn-1:user",
        role: "user",
        metadata: { status: "complete", turnId: "turn-1" },
        parts: [{ type: "text", text: "hi" }],
      },
      {
        id: "turn-1:assistant",
        role: "assistant",
        metadata: { status: "complete", turnId: "turn-1" },
        parts: [{ type: "text", text: "hello", state: "done" }],
      },
    ],
  };

  it("derives createdAt from the earliest event timestamp of the message's turn", () => {
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: resumedData,
        events: [
          {
            type: "turn.started",
            data: { sequence: 0, turnId: "turn-1" },
            meta: { at: "2026-01-02T03:04:05.000Z" },
          },
          {
            type: "message.received",
            data: { message: "hi", sequence: 1, turnId: "turn-1" },
            meta: { at: "2026-01-02T03:04:06.000Z" },
          },
        ],
      }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    const messages = result.current.thread.getState().messages;
    expect(messages[0]?.createdAt).toEqual(
      new Date("2026-01-02T03:04:05.000Z"),
    );
    expect(messages[1]?.createdAt).toEqual(
      new Date("2026-01-02T03:04:05.000Z"),
    );
  });

  it("stamps a live-streamed message with the current time when no event carries its turn", () => {
    const before = Date.now();
    mockUseEveAgent.mockReturnValue(
      createAgent({ status: "streaming", events: [] }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    const createdAt = result.current.thread
      .getState()
      .messages.at(-1)?.createdAt;
    expect(createdAt).toBeInstanceOf(Date);
    expect(createdAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(createdAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("keeps durable timestamps untouched and bounds a runaway fallback between its durable neighbors", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T00:00:00.000Z"));
    try {
      mockUseEveAgent.mockReturnValue(
        createAgent({
          data: {
            messages: [
              {
                id: "turn-0:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-0" },
                parts: [{ type: "text", text: "first" }],
              },
              {
                id: "turn-1:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-1" },
                parts: [{ type: "text", text: "second" }],
              },
              {
                id: "turn-2:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-2" },
                parts: [{ type: "text", text: "third" }],
              },
            ],
          } satisfies EveMessageData,
          events: [
            {
              type: "message.received",
              data: { message: "second", sequence: 0, turnId: "turn-1" },
              meta: { at: "2020-01-01T00:00:00.000Z" },
            },
            {
              type: "message.received",
              data: { message: "third", sequence: 1, turnId: "turn-2" },
              meta: { at: "2025-01-01T00:00:00.000Z" },
            },
          ],
        }) as never,
      );

      const { result } = renderHook(() => useEveAgentRuntime());

      const messages = result.current.thread.getState().messages;
      expect(messages[0]!.createdAt).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
      expect(messages[1]!.createdAt).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
      expect(messages[2]!.createdAt).toEqual(
        new Date("2025-01-01T00:00:00.000Z"),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("raises a fallback timestamp to the previous durable timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2010-01-01T00:00:00.000Z"));
    try {
      mockUseEveAgent.mockReturnValue(
        createAgent({
          data: {
            messages: [
              {
                id: "turn-0:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-0" },
                parts: [{ type: "text", text: "first" }],
              },
              {
                id: "turn-1:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-1" },
                parts: [{ type: "text", text: "second" }],
              },
            ],
          } satisfies EveMessageData,
          events: [
            {
              type: "message.received",
              data: { message: "first", sequence: 0, turnId: "turn-0" },
              meta: { at: "2020-01-01T00:00:00.000Z" },
            },
          ],
        }) as never,
      );

      const { result } = renderHook(() => useEveAgentRuntime());

      const messages = result.current.thread.getState().messages;
      expect(messages[0]!.createdAt).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
      expect(messages[1]!.createdAt).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("rescans from scratch when the event log is not a prefix extension of the cached one", () => {
    const sessionAEvents = Array.from({ length: 3 }, (_, i) => ({
      type: "turn.started",
      data: { sequence: i, turnId: `a-${i}` },
      meta: { at: new Date(1600000000000 + i * 1000).toISOString() },
    }));
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: {
          messages: [
            {
              id: "a-0:user",
              role: "user",
              metadata: { status: "complete", turnId: "a-0" },
              parts: [{ type: "text", text: "session a" }],
            },
          ],
        } satisfies EveMessageData,
        events: sessionAEvents,
      }) as never,
    );

    const { result, rerender } = renderHook(() => useEveAgentRuntime());
    expect(result.current.thread.getState().messages[0]!.createdAt).toEqual(
      new Date(1600000000000),
    );

    const sessionBEvents = Array.from({ length: 5 }, (_, i) => ({
      type: "turn.started",
      data: { sequence: i, turnId: `b-${i}` },
      meta: { at: new Date(1700000000000 + i * 1000).toISOString() },
    }));
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: {
          messages: [
            {
              id: "b-0:user",
              role: "user",
              metadata: { status: "complete", turnId: "b-0" },
              parts: [{ type: "text", text: "session b" }],
            },
          ],
        } satisfies EveMessageData,
        events: sessionBEvents,
      }) as never,
    );
    rerender();

    expect(result.current.thread.getState().messages[0]!.createdAt).toEqual(
      new Date(1700000000000),
    );
  });

  it("re-derives timestamps only for newly appended events", () => {
    const counter = { reads: 0 };
    const makeEvent = (sequence: number) =>
      new Proxy(
        {
          type: "turn.started",
          data: { sequence, turnId: `turn-${sequence}` },
          meta: { at: new Date(1700000000000 + sequence * 1000).toISOString() },
        },
        {
          get(target, prop, receiver) {
            if (prop === "meta") counter.reads++;
            return Reflect.get(target, prop, receiver);
          },
        },
      );

    const initialEvents = Array.from({ length: 50 }, (_, i) => makeEvent(i));
    mockUseEveAgent.mockReturnValue(
      createAgent({ data: resumedData, events: initialEvents }) as never,
    );

    const { rerender } = renderHook(() => useEveAgentRuntime());
    expect(counter.reads).toBeGreaterThanOrEqual(50);

    counter.reads = 0;
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: resumedData,
        events: [...initialEvents, makeEvent(50)],
      }) as never,
    );
    rerender();

    expect(counter.reads).toBe(1);
  });

  it("keeps the message list identity when new events carry no new turn", () => {
    const events = [
      {
        type: "turn.started",
        data: { sequence: 0, turnId: "turn-1" },
        meta: { at: "2020-01-01T00:00:00.000Z" },
      },
    ];
    mockUseEveAgent.mockReturnValue(
      createAgent({ data: resumedData, events }) as never,
    );

    const { result, rerender } = renderHook(() => useEveAgentRuntime());
    const before = result.current.thread.getState().messages;

    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: resumedData,
        events: [
          ...events,
          {
            type: "message.appended",
            data: { messageSoFar: "hel", sequence: 1, turnId: "turn-1" },
            meta: { at: "2020-01-01T00:00:01.000Z" },
          },
        ],
      }) as never,
    );
    rerender();

    expect(result.current.thread.getState().messages).toBe(before);
  });

  it("rescans when an earlier event is replaced but a later one is shared", () => {
    const shared = {
      type: "turn.started",
      data: { sequence: 1, turnId: "turn-shared" },
      meta: { at: "2020-06-01T00:00:00.000Z" },
    };
    const first = {
      type: "turn.started",
      data: { sequence: 0, turnId: "turn-1" },
      meta: { at: "2020-01-01T00:00:00.000Z" },
    };
    mockUseEveAgent.mockReturnValue(
      createAgent({ data: resumedData, events: [first, shared] }) as never,
    );

    const { result, rerender } = renderHook(() => useEveAgentRuntime());
    expect(result.current.thread.getState().messages[0]!.createdAt).toEqual(
      new Date("2020-01-01T00:00:00.000Z"),
    );

    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: { ...resumedData },
        events: [
          { ...first, meta: { at: "2021-01-01T00:00:00.000Z" } },
          shared,
          {
            type: "turn.started",
            data: { sequence: 2, turnId: "turn-2" },
            meta: { at: "2022-01-01T00:00:00.000Z" },
          },
        ],
      }) as never,
    );
    rerender();

    expect(result.current.thread.getState().messages[0]!.createdAt).toEqual(
      new Date("2021-01-01T00:00:00.000Z"),
    );
  });

  it("falls back to first-observation time when events carry no meta.at", () => {
    const before = Date.now();
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: resumedData,
        events: [
          { type: "turn.started", data: { sequence: 0, turnId: "turn-1" } },
        ],
      }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    const createdAt = result.current.thread.getState().messages[0]?.createdAt;
    expect(createdAt).toBeInstanceOf(Date);
    expect(createdAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(createdAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
