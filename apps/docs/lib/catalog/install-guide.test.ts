import { describe, expect, it } from "vitest";
import { installGuideUrl, parseItemSlugs } from "./install-guide";

describe("install guide url", () => {
  it("round-trips items through the query string", () => {
    const url = installGuideUrl(["assistant-ui", "cloud"]);
    expect(url).toBe("/install.md?items=assistant-ui,cloud");
    expect(
      parseItemSlugs(new URL(url, "https://x").searchParams.get("items")),
    ).toEqual(["assistant-ui", "cloud"]);
  });

  it("builds the absolute form", () => {
    expect(installGuideUrl(["cloud"], { absolute: true })).toBe(
      "https://www.assistant-ui.com/install.md?items=cloud",
    );
    expect(installGuideUrl([])).toBe("/install.md");
  });

  it("dedupes and trims parsed items", () => {
    expect(parseItemSlugs(" cloud , cloud,,assistant-ui ")).toEqual([
      "cloud",
      "assistant-ui",
    ]);
    expect(parseItemSlugs(null)).toEqual([]);
  });
});
