import { describe, expect, it } from "vitest";
import {
  classifyTemporal,
  formatTemporalInstant,
  formatTemporalUnixSeconds,
  fromLocalDateTime,
  fromOffsetDateTime,
  mergeTemporalMinutes,
  normalizeTemporalInputValue,
  splitTemporalMinutes,
  temporalOffsetLabel,
  toLocalDateTime,
} from "./temporal";

describe("temporal values", () => {
  it("splits instants in their own offset or another offset", () => {
    expect(splitTemporalMinutes("2025-12-15T17:00:00+02:00")).toEqual({
      date: "2025-12-15",
      time: "17:00",
      droppedPrecision: false,
    });
    expect(splitTemporalMinutes("2025-12-14T23:30:00Z", "+02:00")).toEqual({
      date: "2025-12-15",
      time: "01:30",
      droppedPrecision: false,
    });
    expect(temporalOffsetLabel("2025-12-15T17:00Z")).toBe("UTC");
    expect(temporalOffsetLabel("2025-12-15T17:00+02:00")).toBe("UTC+02:00");
  });

  it("merges a wall minute using the original offset and precision", () => {
    expect(
      fromOffsetDateTime(
        "2025-12-16T18:20",
        "2025-12-15T17:00:30.123456+02:00",
      ),
    ).toBe("2025-12-16T18:20:30.123456+02:00");
    expect(fromOffsetDateTime("2025-12-16T18:20", "2025-12-15T17:00:00Z")).toBe(
      "2025-12-16T18:20:00Z",
    );
    expect(fromOffsetDateTime("2025-12-16T18:20")).toBe("2025-12-16T18:20");
    expect(fromOffsetDateTime("", "2025-12-15T17:00Z")).toBe("");
  });
  it.each([
    ["17:00", { time: "17:00", droppedPrecision: false }],
    ["17:00:00", { time: "17:00", droppedPrecision: false }],
    ["17:00:30", { time: "17:00", droppedPrecision: true }],
    [
      "2025-12-15T17:00",
      { date: "2025-12-15", time: "17:00", droppedPrecision: false },
    ],
    [
      "2025-12-15T17:00:00.000",
      { date: "2025-12-15", time: "17:00", droppedPrecision: false },
    ],
    [
      "2025-12-15T17:00:00.001",
      { date: "2025-12-15", time: "17:00", droppedPrecision: true },
    ],
    [
      "2025-12-15T17:00Z",
      { date: "2025-12-15", time: "17:00", droppedPrecision: false },
    ],
    [
      "2025-12-15T17:00:30.001Z",
      { date: "2025-12-15", time: "17:00", droppedPrecision: true },
    ],
    [
      "2025-12-15T17:00:00.000Z",
      { date: "2025-12-15", time: "17:00", droppedPrecision: false },
    ],
    ["2025-12-15", undefined],
    ["invalid", undefined],
    ["", undefined],
  ])("splits %s into minute precision wall-clock parts", (value, expected) => {
    expect(splitTemporalMinutes(value as string)).toEqual(expected);
  });

  it.each([
    ["2025-12-15", "17:00", "2025-12-15T17:00"],
    ["2025-12-15", "17:00:30", "2025-12-15T17:00"],
    ["", "17:00", ""],
    ["2025-12-15", "", ""],
    ["2025-02-29", "17:00", ""],
    ["2025-12-15", "24:00", ""],
  ])("merges %j and %j without assigning a zone", (date, time, expected) => {
    expect(mergeTemporalMinutes(date!, time!)).toBe(expected);
  });

  it.each([
    [1765818000, "Z", "2025-12-15T17:00:00Z"],
    [1765810800, "+02:00", "2025-12-15T17:00:00+02:00"],
    [0, "-00:00", "1970-01-01T00:00:00-00:00"],
    [-1, "Z", "1969-12-31T23:59:59Z"],
    [0, "+24:00", undefined],
    [0.5, "Z", undefined],
    [Infinity, "Z", undefined],
    [NaN, "Z", undefined],
    [Number.MAX_SAFE_INTEGER, "Z", undefined],
  ])(
    "formats unix seconds %s with offset %s safely",
    (seconds, offset, expected) => {
      expect(
        formatTemporalUnixSeconds(seconds as number, offset as string),
      ).toBe(expected);
    },
  );

  it.each([
    ["12:00:00", "12:00"],
    ["12:00:00.000", "12:00"],
    ["12:00:05.1200", "12:00:05.12"],
    ["2025-12-15T12:00:00.000", "2025-12-15T12:00"],
    ["2025-12-15T12:00:05.1200", "2025-12-15T12:00:05.12"],
    ["2025-12-15", "2025-12-15"],
  ])("normalizes the browser input value %s", (value, expected) => {
    expect(normalizeTemporalInputValue(value!)).toBe(expected);
  });

  it("completes normalization of a 100000 digit zero fraction", () => {
    const zeros = "0".repeat(100_000);
    for (const value of [zeros, `12:00:00.${zeros}`, `12:00:00.${zeros}1`]) {
      expect(normalizeTemporalInputValue(value)).toBe(value);
    }
    expect(normalizeTemporalInputValue("12:00:00.000000000")).toBe("12:00");
    expect(normalizeTemporalInputValue("12:00:00.100000000")).toBe(
      "12:00:00.1",
    );
  });

  it("uses a fixed viewer time zone with seasonal offsets", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
      "America/New_York",
    );
    expect(new Date("2026-01-15T12:00Z").getTimezoneOffset()).toBe(300);
    expect(new Date("2026-07-15T12:00Z").getTimezoneOffset()).toBe(240);
  });

  it.each([
    ["2026-07-15", "date"],
    ["2024-02-29", "date"],
    ["00:00", "time"],
    ["23:59:59", "time"],
    ["2026-07-15T12:34", "floating"],
    ["2026-07-15T12:34:56", "floating"],
    ["2026-07-15T12:34:56.123456", "floating"],
  ])("classifies and passes through %s as %s", (value, kind) => {
    expect(classifyTemporal(value!)).toMatchObject({ kind, value });
    expect(toLocalDateTime(value!)).toBe(value);
    expect(fromLocalDateTime(value!, value!)).toBe(value);
  });

  describe.each([
    { offset: "Z", local: "2026-07-15T08:34" },
    { offset: "+08:00", local: "2026-07-15T00:34" },
    { offset: "-05:30", local: "2026-07-15T14:04" },
  ])("$offset instants", ({ offset, local }) => {
    it.each([
      { suffix: "", precision: "minutes" },
      { suffix: ":56", precision: "seconds" },
      { suffix: ":56.1", precision: 1 },
      { suffix: ":56.12", precision: 2 },
      { suffix: ":56.123", precision: 3 },
      { suffix: ":56.123456789", precision: 9 },
      { suffix: ":00.000009", precision: 6 },
    ])(
      "round trips local wall time at $precision precision",
      ({ suffix, precision }) => {
        const value = `2026-07-15T12:34${suffix}${offset}`;
        const parsed = classifyTemporal(value);
        expect(parsed).toMatchObject({
          kind: "instant",
          epochMs: Date.parse(value),
          offset,
          precision,
        });
        if (parsed.kind !== "instant") throw new Error("Expected an instant");
        expect(formatTemporalInstant(parsed)).toBe(value);
        const wallTime = toLocalDateTime(value);
        expect(wallTime).toBe(`${local}${suffix.slice(0, 3)}`);
        expect(fromLocalDateTime(wallTime, value)).toBe(value);
      },
    );
  });

  it("formats an instant in another offset and precision across calendar boundaries", () => {
    const parsed = classifyTemporal("2026-01-01T00:15:30.120Z");
    if (parsed.kind !== "instant") throw new Error("Expected an instant");
    expect(formatTemporalInstant(parsed, "-05:30", "minutes")).toBe(
      "2025-12-31T18:45-05:30",
    );
    expect(formatTemporalInstant(parsed, "+08:00", "seconds")).toBe(
      "2026-01-01T08:15:30+08:00",
    );
    expect(formatTemporalInstant(parsed, "Z", 6)).toBe(
      "2026-01-01T00:15:30.120000Z",
    );
  });

  it("preserves offset spelling and fractional digits when editing an instant", () => {
    expect(
      fromLocalDateTime(
        "2026-07-16T10:20:30",
        "2026-07-15T12:34:56.123456789-00:00",
      ),
    ).toBe("2026-07-16T14:20:30.123456789-00:00");
  });

  it.each([
    ["2026-01-15T12:34", "2026-01-15T12:34:00-05:00"],
    ["2026-07-15T12:34", "2026-07-15T12:34:00-04:00"],
  ])("uses the viewer offset at %s for an empty value", (value, expected) => {
    expect(fromLocalDateTime(value!, "")).toBe(expected);
    expect(fromLocalDateTime(value!)).toBe(expected);
  });

  it.each([
    {
      value: "2026-03-08T02:30:45",
      parts: [2026, 2, 8, 2, 30, 45] as const,
      expected: "2026-03-08T07:30:45.123456Z",
      local: "2026-03-08T03:30:45",
    },
    {
      value: "2026-11-01T01:30:45",
      parts: [2026, 10, 1, 1, 30, 45] as const,
      expected: "2026-11-01T05:30:45.123456Z",
      local: "2026-11-01T01:30:45",
    },
  ])(
    "resolves DST wall time $value like the native constructor",
    ({ value, parts, expected, local }) => {
      const result = fromLocalDateTime(value, "2026-01-15T12:00:00.123456Z");
      expect(result).toBe(expected);
      const [year, month, day, hour, minute, second] = parts;
      expect(Date.parse(result)).toBe(
        new Date(year, month, day, hour, minute, second).getTime() + 123,
      );
      expect(toLocalDateTime(result)).toBe(local);
      expect(fromLocalDateTime(value, value)).toBe(value);
    },
  );

  it("preserves an empty input when an instant is cleared", () => {
    expect(fromLocalDateTime("", "2026-07-15T12:34:56+08:00")).toBe("");
  });

  it.each([
    "",
    "not a date",
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-01-00",
    "24:00",
    "12:60",
    "12:34:60",
    "12:34:56.1",
    "2026-07-15T24:00Z",
    "2026-07-15T12:60Z",
    "2026-07-15T12:34:60Z",
    "2026-02-29T12:34Z",
    "2026-07-15T12:34.1Z",
    "2026-07-15T12:34+24:00",
    "2026-07-15T12:34+08:60",
    "2026-07-15T12:34+0800",
    "2026-07-15 12:34Z",
  ])("classifies %j as unparseable and passes it through", (value) => {
    expect(classifyTemporal(value)).toEqual({ kind: "unparseable", value });
    expect(toLocalDateTime(value)).toBe(value);
    expect(fromLocalDateTime(value)).toBe(value);
  });
});
