import { describe, expect, it } from "vitest";
import { withVersion } from "./sandbox-contract";

describe("withVersion", () => {
  it("appends the version to a plain path", () => {
    expect(withVersion("/preview", "v2")).toBe("/preview?v=v2");
  });

  it("keeps an existing v parameter", () => {
    expect(withVersion("/preview?v=v1", "v2")).toBe("/preview?v=v1");
  });

  it("returns the url unchanged without a version", () => {
    expect(withVersion("/preview#studio", null)).toBe("/preview#studio");
  });

  it("inserts the version before a fragment", () => {
    expect(withVersion("/preview#studio", "v2")).toBe("/preview?v=v2#studio");
  });

  it("preserves query and fragment together", () => {
    expect(withVersion("/preview?tab=a#studio", "v2")).toBe(
      "/preview?tab=a&v=v2#studio",
    );
  });
});
