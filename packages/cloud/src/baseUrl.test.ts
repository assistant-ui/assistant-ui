import { describe, expect, it } from "vitest";
import { normalizeBaseUrl } from "./baseUrl";

describe("normalizeBaseUrl", () => {
  it("strips every trailing slash", () => {
    expect(normalizeBaseUrl("https://example.com//")).toBe(
      "https://example.com",
    );
  });

  it("returns a missing base URL unchanged", () => {
    expect(normalizeBaseUrl(undefined as unknown as string)).toBeUndefined();
    expect(normalizeBaseUrl("")).toBe("");
  });
});
