import { describe, expect, it } from "vitest";
import { decodeCloudTimestamp } from "./decodeCloudTimestamp";

describe("decodeCloudTimestamp", () => {
  it("decodes a canonical Cloud timestamp", () => {
    expect(
      decodeCloudTimestamp(
        "2026-07-16T12:15:00.123Z",
        "thread.updated_at",
      ).toISOString(),
    ).toBe("2026-07-16T12:15:00.123Z");
  });

  it.each([
    "2026-02-30T12:15:00.000Z",
    "2026-13-01T12:15:00Z",
    "2026-07-16 12:15:00.123456",
    "2026-07-16T12:15:00.123+00:00",
    new Date("2026-07-16T12:15:00.123Z"),
    "not-a-timestamp",
  ])("rejects invalid timestamp %s", (value) => {
    expect(() => decodeCloudTimestamp(value, "thread.updated_at")).toThrow(
      'Invalid Assistant Cloud response timestamp for "thread.updated_at"',
    );
  });
});
