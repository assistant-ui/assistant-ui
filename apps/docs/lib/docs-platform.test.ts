import { describe, expect, it } from "vitest";
import {
  getPlatformMarkdownUrl,
  isPlatform,
  resolveDocsPlatform,
} from "./docs-platform";

describe("docs platform", () => {
  it("recognizes supported platforms", () => {
    expect(isPlatform("react")).toBe(true);
    expect(isPlatform("rn")).toBe(true);
    expect(isPlatform("ink")).toBe(true);
    expect(isPlatform("vue")).toBe(false);
  });

  it("falls back to React for missing or invalid platform parameters", () => {
    expect(resolveDocsPlatform(null)).toBe("react");
    expect(resolveDocsPlatform("vue")).toBe("react");
  });

  it("adds the selected platform without dropping other parameters", () => {
    expect(
      getPlatformMarkdownUrl("/docs/runtimes/ai-sdk/v7.md?view=radix-ui", "rn"),
    ).toBe("/docs/runtimes/ai-sdk/v7.md?view=radix-ui&platform=rn");
  });

  it("keeps React markdown URLs canonical", () => {
    expect(
      getPlatformMarkdownUrl(
        "/docs/runtimes/ai-sdk/v7.md?platform=ink",
        "react",
      ),
    ).toBe("/docs/runtimes/ai-sdk/v7.md");
  });
});
