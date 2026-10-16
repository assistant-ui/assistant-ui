import { describe, expect, it } from "vitest";
import { getMcpToolName } from "./toolName";

describe("getMcpToolName", () => {
  it("preserves provider-compatible names, including the length boundary", () => {
    expect(getMcpToolName("docs", "search")).toBe("docs__search");
    expect(getMcpToolName("a".repeat(36), "b".repeat(26))).toBe(
      `${"a".repeat(36)}__${"b".repeat(26)}`,
    );
  });

  it.each([
    ["a".repeat(36), "get_pull_request_review_comments"],
    ["a".repeat(100), "search"],
    ["docs", "a".repeat(100)],
    ["docs", "files.read"],
    ["docs", "search\n"],
    ["docs / tools", "search"],
    ["文档", "搜索"],
  ])("bounds and sanitizes the name for %s / %s", (serverId, toolName) => {
    const name = getMcpToolName(serverId, toolName);
    expect(name.length).toBeLessThanOrEqual(64);
    expect(name).not.toMatch(/[^a-zA-Z0-9_-]/);
  });

  it("retains a readable tool name in an alias", () => {
    expect(
      getMcpToolName("a".repeat(36), "get_pull_request_review_comments"),
    ).toContain("get_pull_request_review_comments");
  });

  it("distinguishes tools and servers whose readable prefixes are equal", () => {
    const prefix = "shared_prefix_".repeat(8);
    const names = [
      getMcpToolName("docs", `${prefix}first`),
      getMcpToolName("docs", `${prefix}second`),
      getMcpToolName("other", `${prefix}first`),
      getMcpToolName(`${prefix}first`, "search"),
      getMcpToolName(`${prefix}second`, "search"),
    ];
    expect(new Set(names).size).toBe(names.length);
  });

  it("distinguishes names that sanitize to the same readable suffix", () => {
    expect(getMcpToolName("docs", "files.read")).not.toBe(
      getMcpToolName("docs", "files/read"),
    );
  });
});
