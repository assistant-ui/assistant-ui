import { describe, expect, it } from "vitest";
import { normalizeCloudTimestamp } from "./normalizeCloudTimestamp";

describe("normalizeCloudTimestamp", () => {
  it.each([
    ["2024-02-29 12:15:00", "2024-02-29T12:15:00.000Z"],
    ["2026-07-16T12:15:00.123Z", "2026-07-16T12:15:00.123Z"],
    ["2026-07-16T12:15:00.123", "2026-07-16T12:15:00.123Z"],
    ["2026-07-16 12:15:00.5", "2026-07-16T12:15:00.500Z"],
    ["2026-07-16 12:15:00.123456", "2026-07-16T12:15:00.123Z"],
    ["2026-07-16 12:15:00.123456+00", "2026-07-16T12:15:00.123Z"],
    ["2026-07-16 12:15:00+02:30", "2026-07-16T09:45:00.000Z"],
    ["2026-07-16 12:15:00-04", "2026-07-16T16:15:00.000Z"],
  ])("normalizes %s", (value, expected) => {
    expect(
      normalizeCloudTimestamp(value, "thread.updated_at").toISOString(),
    ).toBe(expected);
  });

  it("preserves valid Date objects", () => {
    const value = new Date("2026-07-16T12:15:00.000Z");

    expect(normalizeCloudTimestamp(value, "thread.updated_at")).toBe(value);
  });

  it.each([
    "2026-02-30 12:15:00",
    "2025-02-29 12:15:00",
    "2026-13-01T12:15:00Z",
    "2026-07-16 12:15",
    "2026-07-16 12:15:00 UTC",
    "not-a-timestamp",
  ])("rejects invalid timestamp %s", (value) => {
    expect(() => normalizeCloudTimestamp(value, "thread.updated_at")).toThrow(
      'Invalid Assistant Cloud response timestamp for "thread.updated_at"',
    );
  });
});
