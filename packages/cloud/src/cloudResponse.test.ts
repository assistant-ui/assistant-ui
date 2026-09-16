import { describe, expect, it } from "vitest";
import {
  CloudResponseError,
  readCloudNullableNumber,
  readCloudNumber,
  readCloudTimestamp,
} from "./cloudResponse";

describe("readCloudTimestamp", () => {
  it("decodes a canonical Cloud timestamp", () => {
    expect(
      readCloudTimestamp(
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
    const decode = () => readCloudTimestamp(value, "thread.updated_at");
    expect(decode).toThrow(CloudResponseError);
    expect(decode).toThrow(
      'Invalid Assistant Cloud response for "thread.updated_at": expected a canonical ISO timestamp',
    );
  });
});

describe("readCloudNumber", () => {
  it("returns a finite number", () => {
    expect(readCloudNumber(0.5, "score.value")).toBe(0.5);
    expect(readCloudNumber(0, "score.value")).toBe(0);
  });

  it.each([null, undefined, "1", true, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects %s",
    (value) => {
      const decode = () => readCloudNumber(value, "score.value");
      expect(decode).toThrow(CloudResponseError);
      expect(decode).toThrow(
        'Invalid Assistant Cloud response for "score.value": expected a number',
      );
    },
  );
});

describe("readCloudNullableNumber", () => {
  it("passes null through and validates everything else", () => {
    expect(readCloudNullableNumber(null, "score.value")).toBeNull();
    expect(readCloudNullableNumber(1, "score.value")).toBe(1);
    expect(() => readCloudNullableNumber("1", "score.value")).toThrow(
      CloudResponseError,
    );
  });
});
