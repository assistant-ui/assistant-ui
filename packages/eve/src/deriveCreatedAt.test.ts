import { describe, expect, it } from "vitest";
import {
  assignCreatedAt,
  collectTurnTimestamps,
  createTurnTimestampCache,
  type AssignedCreatedAt,
} from "./deriveCreatedAt";

const event = (type: string, turnId: string, at: string | undefined): never =>
  ({
    type,
    data: { turnId },
    ...(at === undefined ? {} : { meta: { at } }),
  }) as never;

const message = (id: string, role: string, turnId?: string): never =>
  ({
    id,
    role,
    ...(turnId === undefined ? {} : { metadata: { turnId } }),
  }) as never;

const messages = (...list: never[]): never => list as never;

describe("collectTurnTimestamps", () => {
  it("stamps the user message at message.received and the assistant at the next event", () => {
    const timestamps = collectTurnTimestamps(
      [
        event("turn.started", "t1", "2026-01-02T03:04:05.000Z"),
        event("message.received", "t1", "2026-01-02T03:04:06.000Z"),
        event("text.delta", "t1", "2026-01-02T03:06:00.000Z"),
      ],
      createTurnTimestampCache(),
    );

    expect(timestamps.get("t1")).toEqual({
      turn: new Date("2026-01-02T03:04:05.000Z"),
      user: new Date("2026-01-02T03:04:06.000Z"),
      assistant: new Date("2026-01-02T03:06:00.000Z"),
    });
  });

  it("returns the same map by identity when appended events carry no new turn", () => {
    const cache = createTurnTimestampCache();
    const events = [
      event("message.received", "t1", "2026-01-02T03:04:06.000Z"),
    ];
    const first = collectTurnTimestamps(events, cache);
    const second = collectTurnTimestamps(
      [...events, event("message.received", "t1", "2026-01-02T03:04:09.000Z")],
      cache,
    );

    expect(second).toBe(first);
  });

  it("rescans from scratch when an earlier event was replaced", () => {
    const cache = createTurnTimestampCache();
    const original = event(
      "message.received",
      "t1",
      "2026-01-02T03:04:06.000Z",
    );
    const later = event("text.delta", "t1", "2026-01-02T03:06:00.000Z");
    collectTurnTimestamps([original, later], cache);

    const replaced = event(
      "message.received",
      "t1",
      "2026-01-02T09:00:00.000Z",
    );
    const timestamps = collectTurnTimestamps([replaced, later], cache);

    expect(timestamps.get("t1")?.user).toEqual(
      new Date("2026-01-02T09:00:00.000Z"),
    );
  });

  it("skips events with no meta.at and events whose timestamp does not parse", () => {
    const timestamps = collectTurnTimestamps(
      [
        event("message.received", "t1", undefined),
        event("message.received", "t2", "not-a-date"),
      ],
      createTurnTimestampCache(),
    );

    expect(timestamps.size).toBe(0);
  });
});

describe("assignCreatedAt", () => {
  const turnTimestamps = new Map([
    [
      "t1",
      {
        turn: new Date("2026-01-02T03:04:06.000Z"),
        user: new Date("2026-01-02T03:04:06.000Z"),
        assistant: new Date("2026-01-02T03:06:00.000Z"),
      },
    ],
  ]);

  it("assigns each role its own durable timestamp", () => {
    const assigned = assignCreatedAt(
      messages(message("m1", "user", "t1"), message("m2", "assistant", "t1")),
      turnTimestamps,
      new Map(),
    );

    expect(assigned.get("m1")).toEqual(new Date("2026-01-02T03:04:06.000Z"));
    expect(assigned.get("m2")).toEqual(new Date("2026-01-02T03:06:00.000Z"));
  });

  it("resolves an assistant message with no event of its own at the user's timestamp", () => {
    const assigned = assignCreatedAt(
      messages(message("m1", "user", "t1"), message("m2", "assistant", "t1")),
      new Map([
        [
          "t1",
          {
            turn: new Date("2026-01-02T03:04:05.000Z"),
            user: new Date("2026-01-02T03:04:06.000Z"),
          },
        ],
      ]),
      new Map(),
    );

    expect(assigned.get("m2")).toEqual(new Date("2026-01-02T03:04:06.000Z"));
  });

  it("bounds a leading fallback at the next durable timestamp", () => {
    const assigned = assignCreatedAt(
      messages(message("m0", "user"), message("m1", "user", "t1")),
      turnTimestamps,
      new Map(),
      () => new Date("2026-06-01T00:00:00.000Z"),
    );

    expect(assigned.get("m0")).toEqual(new Date("2026-01-02T03:04:06.000Z"));
  });

  it("raises a trailing fallback to the previous durable timestamp", () => {
    const assigned = assignCreatedAt(
      messages(message("m1", "user", "t1"), message("m2", "assistant")),
      turnTimestamps,
      new Map(),
      () => new Date("2020-01-01T00:00:00.000Z"),
    );

    expect(assigned.get("m2")).toEqual(new Date("2026-01-02T03:04:06.000Z"));
  });

  it("keeps a durable timestamp the current event window no longer covers", () => {
    const remembered = new Map<string, AssignedCreatedAt>();
    assignCreatedAt(
      messages(message("m1", "user", "t1")),
      turnTimestamps,
      remembered,
    );

    const assigned = assignCreatedAt(
      messages(message("m1", "user", "t1")),
      new Map(),
      remembered,
      () => new Date("2026-06-01T00:00:00.000Z"),
    );

    expect(assigned.get("m1")).toEqual(new Date("2026-01-02T03:04:06.000Z"));
  });

  it("forgets a message that left the list", () => {
    const remembered = new Map<string, AssignedCreatedAt>();
    assignCreatedAt(
      messages(message("m1", "user", "t1")),
      turnTimestamps,
      remembered,
    );

    assignCreatedAt(
      messages(message("m2", "user")),
      turnTimestamps,
      remembered,
    );

    expect(remembered.has("m1")).toBe(false);
  });
});
