import { describe, expect, it } from "vitest";
import type { SessionStreamEvent } from "eve/client";

import {
  collectTurnTimestamps,
  createTurnTimestampCache,
} from "./deriveCreatedAt";

const TURN = "turn_1";

const turnStarted = (at: string, turnId = TURN) =>
  ({
    type: "turn.started",
    data: { turnId, cause: { deliveryId: "delivery_1" }, follows: null },
    meta: { at, position: { line: 1, index: 0 } },
  }) as const satisfies SessionStreamEvent;

const deliveryConsumed = (at: string, turnId = TURN) =>
  ({
    type: "delivery.consumed",
    data: {
      deliveryId: "delivery_1",
      parts: [{ kind: "text", text: "hi" }],
      turnId,
    },
    meta: { at, position: { line: 2, index: 0 } },
  }) as const satisfies SessionStreamEvent;

const contextStarted = (at: string, turnId = TURN) =>
  ({
    type: "context.started",
    data: { changeId: "change_1", kind: "compaction", turnId },
    meta: { at, position: { line: 3, index: 0 } },
  }) as const satisfies SessionStreamEvent;

const contentDelta = (at: string, turnId = TURN) =>
  ({
    type: "content.delta",
    scope: { turnId },
    data: { partId: "part_1", kind: "text", delta: "he" },
    meta: { at, position: { line: 4, index: 0 } },
  }) as const satisfies SessionStreamEvent;

const modelStarted = (at: string, turnId = TURN) =>
  ({
    type: "model.started",
    scope: { turnId },
    data: { runId: "run_1", modelId: "m", attempt: 0 },
    meta: { at, position: { line: 4, index: 0 } },
  }) as const satisfies SessionStreamEvent;

describe("collectTurnTimestamps", () => {
  it("stamps the user at delivery.consumed and the assistant at model.started, skipping the turn's other events", () => {
    const timestamps = collectTurnTimestamps(
      [
        turnStarted("2026-01-02T10:00:00.000Z"),
        deliveryConsumed("2026-01-02T10:00:01.000Z"),
        contextStarted("2026-01-02T10:00:02.000Z"),
        modelStarted("2026-01-02T10:02:00.000Z"),
        modelStarted("2026-01-02T10:03:00.000Z"),
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
      deliveryConsumed("2026-01-02T10:00:01.000Z"),
    ];
    const first = collectTurnTimestamps(events, cache);
    expect(first.get(TURN)?.assistant).toBe(undefined);

    const quiet = [
      ...events,
      turnStarted("2026-01-02T10:00:02.000Z", "turn_2"),
    ];
    expect(collectTurnTimestamps(quiet, cache)).toBe(first);

    const timestamps = collectTurnTimestamps(
      [...quiet, modelStarted("2026-01-02T10:02:00.000Z")],
      cache,
    );
    expect(timestamps.get(TURN)?.user).toEqual(
      new Date("2026-01-02T10:00:01.000Z"),
    );
    expect(timestamps.get(TURN)?.assistant).toEqual(
      new Date("2026-01-02T10:02:00.000Z"),
    );
  });

  it("stamps the assistant from the turn's first content event when no model.started precedes it", () => {
    const timestamps = collectTurnTimestamps(
      [
        turnStarted("2026-01-02T10:00:00.000Z"),
        deliveryConsumed("2026-01-02T10:00:01.000Z"),
        contextStarted("2026-01-02T10:00:02.000Z"),
        contentDelta("2026-01-02T10:02:00.000Z"),
      ],
      createTurnTimestampCache(),
    );

    expect(timestamps.get(TURN)?.assistant).toEqual(
      new Date("2026-01-02T10:02:00.000Z"),
    );
  });

  it("skips malformed events without throwing", () => {
    const events: readonly SessionStreamEvent[] = [
      deliveryConsumed("not a date"),
      { ...modelStarted("2026-01-02T10:01:00.000Z"), scope: {} },
      modelStarted("2026-01-02T10:02:00.000Z"),
    ];

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
        deliveryConsumed("2026-01-02T10:00:01.000Z"),
        modelStarted("2026-01-02T10:02:00.000Z"),
      ],
      cache,
    );

    const timestamps = collectTurnTimestamps(
      [deliveryConsumed("2026-03-01T09:00:01.000Z")],
      cache,
    );

    expect(timestamps.get(TURN)?.user).toEqual(
      new Date("2026-03-01T09:00:01.000Z"),
    );
    expect(timestamps.get(TURN)?.assistant).toBe(undefined);
  });

  it("ignores empty deliveries and stamps the first later delivery with parts", () => {
    const empty = {
      ...deliveryConsumed("2026-01-02T10:00:01.000Z"),
      data: { deliveryId: "delivery_1", turnId: TURN, parts: [] },
    } satisfies SessionStreamEvent;
    const timestamps = collectTurnTimestamps(
      [empty, deliveryConsumed("2026-01-02T10:00:02.000Z")],
      createTurnTimestampCache(),
    );

    expect(timestamps.get(TURN)?.user).toEqual(
      new Date("2026-01-02T10:00:02.000Z"),
    );
  });

  it("resumes after an event without a timestamp and keeps the first valid assistant time", () => {
    const cache = createTurnTimestampCache();
    const missingTime = {
      ...contentDelta("2026-01-02T10:01:00.000Z"),
      meta: { position: { line: 4, index: 0 } },
    } as unknown as SessionStreamEvent;
    const firstEvents = [missingTime];
    const first = collectTurnTimestamps(firstEvents, cache);

    expect(first.get(TURN)).toBeUndefined();
    expect(collectTurnTimestamps(firstEvents, cache)).toBe(first);

    const appended = [...firstEvents, modelStarted("2026-01-02T10:02:00.000Z")];
    const second = collectTurnTimestamps(appended, cache);

    expect(second.get(TURN)?.assistant).toEqual(
      new Date("2026-01-02T10:02:00.000Z"),
    );
    expect(collectTurnTimestamps(appended, cache)).toBe(second);
  });
});

describe("collectTurnTimestamps prototype-inherited event types", () => {
  it.each(["__proto__", "constructor", "toString"])(
    "ignores an event whose type is %s",
    (type) => {
      const cache = createTurnTimestampCache();
      const events = [
        {
          type,
          data: {},
          meta: {
            at: "2026-01-01T00:00:00.000Z",
            position: { line: 1, index: 0 },
          },
        },
      ] as SessionStreamEvent[];

      const timestamps = collectTurnTimestamps(events, cache);

      expect(timestamps.get(TURN)).toBeUndefined();
    },
  );
});
