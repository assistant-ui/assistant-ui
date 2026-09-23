import { describe, expect, it } from "vitest";
import {
  TOOL_INTERACTION_LIMITS,
  appendToolInteraction,
  createToolInteraction,
  readToolInteractionLog,
} from "./tool-interactions";

describe("createToolInteraction", () => {
  it("creates action and human-response interactions", () => {
    expect(
      createToolInteraction(
        { type: "action", payload: { $input: "approved" } },
        10,
      ),
    ).toEqual({
      type: "action",
      occurredAt: 10,
      payload: { $input: "approved" },
    });
    expect(
      createToolInteraction({ type: "human-response", payload: false }, 11),
    ).toEqual({ type: "human-response", occurredAt: 11, payload: false });
  });

  it.each([false, 0, "", null])("keeps the human response %j", (payload) => {
    expect(
      createToolInteraction({ type: "human-response", payload }, 10),
    ).toHaveProperty("payload", payload);
  });

  it("returns a JSON clone of the payload", () => {
    const payload = { answer: { value: "yes" } };
    const interaction = createToolInteraction({ type: "action", payload }, 10);

    payload.answer.value = "no";

    expect(interaction.payload).toEqual({ answer: { value: "yes" } });
    expect(interaction.payload).not.toBe(payload);
  });

  it.each([
    ["undefined", undefined],
    ["a function", () => {}],
    ["a bigint", 1n],
    ["a symbol", Symbol("value")],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["a date", new Date()],
    ["a map", new Map()],
    [
      "a class instance",
      new (class Payload {
        readonly value = "x";
      })(),
    ],
  ])("rejects %s", (_label, payload) => {
    expect(() =>
      createToolInteraction({ type: "human-response", payload }, 10),
    ).toThrow("plain JSON");
  });

  it("rejects a cycle", () => {
    const payload: { self?: unknown } = {};
    payload.self = payload;

    expect(() =>
      createToolInteraction({ type: "human-response", payload }, 10),
    ).toThrow("plain JSON");
  });

  it("rejects invalid action payloads, interaction types, and large payloads", () => {
    expect(() =>
      createToolInteraction({ type: "action", payload: ["not an object"] }, 10),
    ).toThrow("JSON object");
    expect(() =>
      createToolInteraction({ type: "unknown", payload: null } as never, 10),
    ).toThrow("Unknown tool interaction type");
    expect(() =>
      createToolInteraction(
        {
          type: "human-response",
          payload: "x".repeat(TOOL_INTERACTION_LIMITS.payloadLength),
        },
        10,
      ),
    ).toThrow("limited");
  });
});

describe("appendToolInteraction", () => {
  const interaction = (occurredAt: number, payload: unknown = occurredAt) =>
    ({
      type: "human-response" as const,
      occurredAt,
      payload,
    }) as ReturnType<typeof createToolInteraction>;

  it("evicts the oldest entries past the entry limit", () => {
    let log = appendToolInteraction(undefined, interaction(0));
    for (let index = 1; index <= TOOL_INTERACTION_LIMITS.entries; index += 1) {
      log = appendToolInteraction(log, interaction(index));
    }

    expect(log).toMatchObject({ omitted: 1 });
    expect(log.entries).toHaveLength(TOOL_INTERACTION_LIMITS.entries);
    expect(log.entries[0]).toHaveProperty("occurredAt", 1);
    expect(log.entries.at(-1)).toHaveProperty(
      "occurredAt",
      TOOL_INTERACTION_LIMITS.entries,
    );
  });

  it("evicts entries past the log length across calls", () => {
    const payload = "x".repeat(16_000);
    let log = appendToolInteraction(undefined, interaction(0, payload));
    for (let index = 1; index < 5; index += 1) {
      log = appendToolInteraction(log, interaction(index, payload));
    }

    expect(log).toMatchObject({ omitted: 1 });
    expect(log.entries.map((entry) => entry.occurredAt)).toEqual([1, 2, 3, 4]);

    log = appendToolInteraction(log, interaction(5, payload));

    expect(log).toMatchObject({ omitted: 2 });
    expect(log.entries.map((entry) => entry.occurredAt)).toEqual([2, 3, 4, 5]);
  });
});

describe("readToolInteractionLog", () => {
  it("keeps readable entries and a positive omitted count", () => {
    const log = readToolInteractionLog({
      entries: [
        { type: "action", occurredAt: 1, payload: { $input: "yes" } },
        { type: "human-response", occurredAt: 2, payload: false },
        { type: "unknown", occurredAt: 3, payload: null },
        { type: "action", occurredAt: Number.POSITIVE_INFINITY, payload: {} },
        { type: "human-response", occurredAt: 4, payload: () => {} },
        { type: "action", occurredAt: 5, payload: [] },
      ],
      omitted: 3,
    });

    expect(log).toEqual({
      entries: [
        { type: "action", occurredAt: 1, payload: { $input: "yes" } },
        { type: "human-response", occurredAt: 2, payload: false },
      ],
      omitted: 3,
    });
  });

  it.each([null, "log", [], {}, { entries: [] }])(
    "returns undefined for unreadable logs: %j",
    (value) => {
      expect(readToolInteractionLog(value)).toBeUndefined();
    },
  );
});
