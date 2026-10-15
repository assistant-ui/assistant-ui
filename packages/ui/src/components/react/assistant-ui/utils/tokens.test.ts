// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatTokenCount } from "./tokens";

describe("formatTokenCount", () => {
  it("prints a count under a thousand as it is", () => {
    expect(formatTokenCount(0)).toBe("0");
    expect(formatTokenCount(950)).toBe("950");
  });

  it("prints thousands and millions to one decimal, dropping a trailing zero", () => {
    expect(formatTokenCount(48_200)).toBe("48.2k");
    expect(formatTokenCount(128_000)).toBe("128k");
    expect(formatTokenCount(912_480_000)).toBe("912.5M");
    expect(formatTokenCount(48_120_000)).toBe("48.1M");
    expect(formatTokenCount(2_000_000_000)).toBe("2B");
  });

  it("moves a count that rounds to a thousand into the next unit", () => {
    expect(formatTokenCount(999_950)).toBe("1M");
    expect(formatTokenCount(999_949_999)).toBe("999.9M");
    expect(formatTokenCount(999_950_000)).toBe("1B");
    expect(formatTokenCount(999_950_000_000)).toBe("1T");
  });

  it("prints trillions in T", () => {
    expect(formatTokenCount(1_000_000_000_000)).toBe("1T");
    expect(formatTokenCount(2_450_000_000_000)).toBe("2.5T");
  });
});
