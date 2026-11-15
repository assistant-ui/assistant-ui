import { describe, expect, it } from "vitest";
import { render } from "markdansi";
import { filterHyperlinks, hyperlinkTarget } from "./filterHyperlinks";

const open = (url: string) => `\u001b]8;;${url}\u0007`;
const close = "\u001b]8;;\u0007";

describe("hyperlinkTarget", () => {
  it.each([
    ["https://example.com/a?b=c#d", "https://example.com/a?b=c#d"],
    ["HTTP://Example.com", "http://example.com/"],
    ["mailto:someone@example.com", "mailto:someone@example.com"],
    ["https://example.com/a b", "https://example.com/a%20b"],
    ["https://例え.jp/パス", "https://xn--r8jz45g.jp/%E3%83%91%E3%82%B9"],
  ])("links %j as %j", (url, expected) => {
    expect(hyperlinkTarget(url)).toBe(expected);
  });

  it.each([
    "javascript:alert(1)",
    "file:///etc/passwd",
    "data:text/html,hi",
    "ssh://host",
    "//example.com",
    "relative/path",
    "",
  ])("does not link %j", (url) => {
    expect(hyperlinkTarget(url)).toBeUndefined();
  });
});

describe("filterHyperlinks", () => {
  it("keeps http links", () => {
    const text = `${open("https://example.com/a")}label${close}`;
    expect(filterHyperlinks(text)).toBe(text);
  });

  it("drops the sequence around other schemes and keeps the text", () => {
    expect(
      filterHyperlinks(
        `a ${open("file:///etc/passwd")}one${close} b ${open("https://ok.example")}two${close}`,
      ),
    ).toBe(`a one b ${open("https://ok.example/")}two${close}`);
  });

  it("drops every segment of a wrapped link", () => {
    expect(
      filterHyperlinks(
        `${open("javascript:x")}one${close}\n${open("javascript:x")}two${close}`,
      ),
    ).toBe("one\ntwo");
  });

  it("leaves text without hyperlinks unchanged", () => {
    expect(filterHyperlinks("plain \u001b[1mbold\u001b[22m")).toBe(
      "plain \u001b[1mbold\u001b[22m",
    );
  });

  it("filters links rendered by markdansi", () => {
    const rendered = filterHyperlinks(
      render(
        "[a](javascript:alert(1)) [b](file:///x) [c](https://example.com)",
        { hyperlinks: true, color: true },
      ),
    );
    expect(rendered).not.toContain("javascript:");
    expect(rendered).not.toContain("file:");
    expect(rendered).toContain(open("https://example.com/"));
    expect(rendered.split("\u001b]8;;").length - 1).toBe(2);
  });
});
