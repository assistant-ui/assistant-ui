import { describe, expect, it } from "vitest";
import type { MessageStreamEvent } from "eve/client";

import {
  collectTurnTimestamps,
  createTurnTimestampCache,
} from "./deriveCreatedAt";

const TURN = "turn_1";

const turnStarted = (at: string, turnId = TURN) =>
  ({
    type: "turn.started",
    data: { sequence: 1, turnId },
    meta: { at, id: `evt_${at}` },
  }) as const satisfies MessageStreamEvent;

const messageReceived = (at: string, turnId = TURN) =>
  ({
    type: "message.received",
    data: { message: "hi", sequence: 2, turnId },
    meta: { at, id: `evt_${at}` },
  }) as const satisfies MessageStreamEvent;

const compactionRequested = (at: string, turnId = TURN) =>
  ({
    type: "compaction.requested",
    data: {
      modelId: "m",
      sequence: 3,
      sessionId: "s",
      turnId,
      usageInputTokens: null,
    },
    meta: { at, id: `evt_${at}` },
  }) as const satisfies MessageStreamEvent;

const messageAppended = (at: string, turnId = TURN) =>
  ({
    type: "message.appended",
    data: {
      messageDelta: "he",
      messageSoFar: "he",
      sequence: 4,
      stepIndex: 0,
      turnId,
    },
    meta: { at, id: `evt_${at}` },
  }) as const satisfies MessageStreamEvent;

const stepStarted = (at: string, turnId = TURN) =>
  ({
    type: "step.started",
    data: { modelId: "m", sequence: 4, stepIndex: 0, turnId },
    meta: { at, id: `evt_${at}` },
  }) as const satisfies MessageStreamEvent;

describe("collectTurnTimestamps", () => {
  it("stamps the user at message.received and the assistant at step.started, skipping the turn's other events", () => {
    const timestamps = collectTurnTimestamps(
      [
        turnStarted("2026-01-02T10:00:00.000Z"),
        messageReceived("2026-01-02T10:00:01.000Z"),
        compactionRequested("2026-01-02T10:00:02.000Z"),
        stepStarted("2026-01-02T10:02:00.000Z"),
        stepStarted("2026-01-02T10:03:00.000Z"),
      ],
      createTurnTimestampCache(),
    );

    expect(timestamps.get(TURN)?.user).toEqual(
      new Date("2026-01-02T10:00:01.000Z"),
    );
    expect(timestamps.get(TURN)?.assistant).toEqual(
      new Date("2026-01-02T10:02:00.000Z"),
    );
    expect(timestamps.get("turn_other")?.user).toBe(undefined);
  });

  it("resumes the scan at appended events and keeps the map identity when they teach nothing", () => {
    const cache = createTurnTimestampCache();
    const events = [
      turnStarted("2026-01-02T10:00:00.000Z"),
      messageReceived("2026-01-02T10:00:01.000Z"),
    ];
    const first = collectTurnTimestamps(events, cache);
    expect(first.get(TURN)?.assistant).toBe(undefined);

    const quiet = [
      ...events,
      turnStarted("2026-01-02T10:00:02.000Z", "turn_2"),
    ];
    expect(collectTurnTimestamps(quiet, cache)).toBe(first);

    const timestamps = collectTurnTimestamps(
      [...quiet, stepStarted("2026-01-02T10:02:00.000Z")],
      cache,
    );
    expect(timestamps.get(TURN)?.user).toEqual(
      new Date("2026-01-02T10:00:01.000Z"),
    );
    expect(timestamps.get(TURN)?.assistant).toEqual(
      new Date("2026-01-02T10:02:00.000Z"),
    );
  });

  it("stamps an assistant created by a turn ending before its first step", () => {
    const timestamps = collectTurnTimestamps(
      [
        messageReceived("2026-01-02T10:00:01.000Z"),
        {
          type: "turn.cancelled",
          data: { sequence: 3, turnId: TURN },
          meta: { at: "2026-01-02T10:00:05.000Z", id: "evt_cancel" },
        },
      ],
      createTurnTimestampCache(),
    );

    expect(timestamps.get(TURN)?.assistant).toEqual(
      new Date("2026-01-02T10:00:05.000Z"),
    );
  });

  it("stamps the assistant from the turn's first message-creating event when no step.started precedes it", () => {
    const timestamps = collectTurnTimestamps(
      [
        turnStarted("2026-01-02T10:00:00.000Z"),
        messageReceived("2026-01-02T10:00:01.000Z"),
        compactionRequested("2026-01-02T10:00:02.000Z"),
        messageAppended("2026-01-02T10:02:00.000Z"),
      ],
      createTurnTimestampCache(),
    );

    expect(timestamps.get(TURN)?.assistant).toEqual(
      new Date("2026-01-02T10:02:00.000Z"),
    );
  });

  it("skips malformed events without throwing", () => {
    const events = [
      { type: "message.received", data: null, meta: { at: "x", id: "e1" } },
      { type: "step.started", meta: { at: "2026-01-01T00:00:00Z", id: "e2" } },
      {
        type: "message.received",
        data: { turnId: 42 },
        meta: { at: "x", id: "e3" },
      },
      {
        type: "message.received",
        data: { message: "hi", sequence: 2, turnId: TURN },
        meta: { at: "not a date", id: "e4" },
      },
      { type: "step.started", data: { stepIndex: 0, turnId: TURN } },
      stepStarted("2026-01-02T10:02:00.000Z"),
    ] as never as readonly MessageStreamEvent[];

    const timestamps = collectTurnTimestamps(
      events,
      createTurnTimestampCache(),
    );

    expect(timestamps.get(TURN)?.user).toBe(undefined);
    expect(timestamps.get(TURN)?.assistant).toEqual(
      new Date("2026-01-02T10:02:00.000Z"),
    );
  });

  it("re-derives from scratch when the log is replaced, so a recurring turn id serves the new session's stamps", () => {
    const cache = createTurnTimestampCache();
    collectTurnTimestamps(
      [
        messageReceived("2026-01-02T10:00:01.000Z"),
        stepStarted("2026-01-02T10:02:00.000Z"),
      ],
      cache,
    );

    const timestamps = collectTurnTimestamps(
      [messageReceived("2026-03-01T09:00:01.000Z")],
      cache,
    );

    expect(timestamps.get(TURN)?.user).toEqual(
      new Date("2026-03-01T09:00:01.000Z"),
    );
    expect(timestamps.get(TURN)?.assistant).toBe(undefined);
  });
});
