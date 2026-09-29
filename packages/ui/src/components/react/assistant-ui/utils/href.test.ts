import { describe, expect, it } from "vitest";
import { hostOf, safeHref } from "./href";

describe("safeHref", () => {
  it("keeps http, https, and mailto URLs as given", () => {
    expect(safeHref("https://example.com/a?b=1#c")).toBe(
      "https://example.com/a?b=1#c",
    );
    expect(safeHref("http://example.com")).toBe("http://example.com");
    expect(safeHref("mailto:team@example.com")).toBe("mailto:team@example.com");
  });

  it("keeps URLs relative to the page", () => {
    for (const url of ["/docs", "#top", "?q=1", "./a", "../b", "//cdn.test/x"])
      expect(safeHref(url)).toBe(url);
  });

  it("refuses targets that run script or embed a document", () => {
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      " javascript:alert(1)",
      "java\tscript:alert(1)",
      "\u0001javascript:alert(1)",
      "vbscript:msgbox(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
    ])
      expect(safeHref(url)).toBeUndefined();
  });

  it("refuses strings that are not URLs", () => {
    for (const url of [undefined, "", "   ", "example.com", "not a url"])
      expect(safeHref(url)).toBeUndefined();
  });
});

describe("hostOf", () => {
  it("names the host without a leading www", () => {
    expect(hostOf("https://www.example.com/a")).toBe("example.com");
    expect(hostOf("https://docs.example.com")).toBe("docs.example.com");
  });

  it("has no host for relative, mailto, or unsafe URLs", () => {
    expect(hostOf("/docs")).toBeUndefined();
    expect(hostOf("mailto:a@example.com")).toBeUndefined();
    expect(hostOf("javascript:alert(1)")).toBeUndefined();
  });
});
