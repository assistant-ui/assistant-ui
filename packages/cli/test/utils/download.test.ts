import { describe, expect, it } from "vitest";
import { resolveDownloadTimeoutMs } from "../../src/lib/utils/download";

describe("resolveDownloadTimeoutMs", () => {
  it("defaults to 120 s", () => {
    expect(resolveDownloadTimeoutMs(undefined)).toBe(120_000);
    expect(resolveDownloadTimeoutMs("")).toBe(120_000);
  });

  it("accepts a valid override in ms", () => {
    expect(resolveDownloadTimeoutMs("300000")).toBe(300_000);
  });

  it("ignores malformed values", () => {
    for (const value of ["2m", "120000ms", "abc", "0", "-5"]) {
      expect(resolveDownloadTimeoutMs(value)).toBe(120_000);
    }
  });

  it("ignores values above the timer limit", () => {
    expect(resolveDownloadTimeoutMs("2147483647")).toBe(2_147_483_647);
    expect(resolveDownloadTimeoutMs("9999999999")).toBe(120_000);
  });
});
