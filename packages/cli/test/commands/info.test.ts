import { describe, expect, it } from "vitest";
import { satisfiesRange } from "../../src/commands/info";

describe("satisfiesRange", () => {
  it.each([
    ["18.3.1", "^18 || ^19"],
    ["19.2.0", "^18 || ^19"],
    ["7.0.0", "^5 || ^6 || ^7"],
    ["0.15.4", "^0.15.0"],
    ["0.5.0", ">=0.5.0"],
  ])("accepts %s for %s", (version, range) => {
    expect(satisfiesRange(version, range)).toBe(true);
  });

  it.each([
    ["20.0.0", "^18 || ^19"],
    ["8.0.0", "^5 || ^6 || ^7"],
    ["0.14.9", "^0.15.0"],
    ["0.16.0", "^0.15.0"],
    ["0.4.9", ">=0.5.0"],
  ])("rejects %s for %s", (version, range) => {
    expect(satisfiesRange(version, range)).toBe(false);
  });

  it.each(["*", "any"])("accepts the unrestricted %s range", (range) => {
    expect(satisfiesRange("20.0.0", range)).toBe(true);
  });

  it("accepts prerelease versions that satisfy the peer range", () => {
    expect(satisfiesRange("19.1.0-rc.1", "^18 || ^19")).toBe(true);
  });

  it.each(["workspace:*", "workspace:^19.0.0"])(
    "accepts workspace protocol range %s",
    (range) => {
      expect(satisfiesRange("19.2.0", range)).toBe(true);
    },
  );
});
