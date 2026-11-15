import { describe, expect, it } from "vitest";
import { render } from "markdansi";
import { filterHyperlinks, hyperlinkTarget } from "./filterHyperlinks";

const open = (url: string) => `\u001b]8;;${url}\u0007`;
const close = "\u001b]8;;\u0007";
const dim = (text: string) => `\u001b[2m${text}\u001b[22m`;

const countClosers = (text: string) => text.split(close).length - 1;
const countOpeners = (text: string) =>
  text.split("\u001b]8;;").length - 1 - countClosers(text);

describe("hyperlinkTarget", () => {
  it.each([
    ["https://example.com/a?b=c#d", "https://example.com/a?b=c#d"],
    ["HTTP://Example.com", "http://example.com/"],
    ["https://example.com/a b", "https://example.com/a%20b"],
    ["https://例え.jp/パス", "https://xn--r8jz45g.jp/%E3%83%91%E3%82%B9"],
  ])("links %j as %j", (url, expected) => {
    expect(hyperlinkTarget(url)).toBe(expected);
  });

  it.each([
    "javascript:alert(1)",
    "file:///etc/passwd",
    "data:text/html,hi",
    "mailto:someone@example.com",
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

  it("shows a refused link's destination as plain text", () => {
    expect(
      filterHyperlinks(
        `a ${open("file:///etc/passwd")}one${close} b ${open("https://ok.example")}two${close}`,
      ),
    ).toBe(
      `a one${dim(" (file:///etc/passwd)")} b ${open("https://ok.example/")}two${close}`,
    );
  });

  it("does not repeat the destination when the label is the URL", () => {
    expect(
      filterHyperlinks(`${open("file:///etc/x")}file:///etc/x${close}`),
    ).toBe("file:///etc/x");
  });

  it("puts the destination after the last segment of a wrapped link", () => {
    expect(
      filterHyperlinks(
        `${open("javascript:x")}one${close}\n  ${open("javascript:x")}two${close} after`,
      ),
    ).toBe(`one\n  two${dim(" (javascript:x)")} after`);
  });

  it("gives each of two adjacent links to the same URL its own suffix", () => {
    expect(
      filterHyperlinks(
        `${open("./a")}one${close} and ${open("./a")}two${close}`,
      ),
    ).toBe(`one${dim(" (./a)")} and two${dim(" (./a)")}`);
  });

  it("accepts ST as the terminator and OSC 8 params", () => {
    expect(
      filterHyperlinks(
        "\u001b]8;id=1;file:///x\u001b\\one\u001b]8;;\u001b\\ \u001b]8;id=2;https://ok.example\u001b\\two\u001b]8;;\u001b\\",
      ),
    ).toBe(
      `one${dim(" (file:///x)")} ${open("https://ok.example/")}two${close}`,
    );
  });

  it("drops an unterminated opener and keeps the rest as text", () => {
    const output = filterHyperlinks(
      `${open("https://ok.example")}two${close} \u001b]8;;file:///x tail`,
    );
    expect(output).toBe(
      `${open("https://ok.example/")}two${close} file:///x tail`,
    );
    expect(output).not.toContain("\u001b]8;;file:");
  });

  it("closes a kept link that the output never closes", () => {
    const output = filterHyperlinks(`${open("https://ok.example")}two`);
    expect(output).toBe(`${open("https://ok.example/")}two${close}`);
  });

  it("closes a kept link before a refused one starts", () => {
    expect(
      filterHyperlinks(`${open("https://ok.example")}a${open("file:///x")}b`),
    ).toBe(`${open("https://ok.example/")}a${close}b${dim(" (file:///x)")}`);
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
    expect(rendered).not.toContain("\u001b]8;;javascript:");
    expect(rendered).not.toContain("\u001b]8;;file:");
    expect(rendered).toContain(dim(" (javascript:alert(1))"));
    expect(rendered).toContain(dim(" (file:///x)"));
    expect(rendered).toContain(open("https://example.com/"));
    expect(countOpeners(rendered)).toBe(1);
    expect(countClosers(rendered)).toBe(1);
  });

  it("balances every opener in wrapped markdansi output", () => {
    const rendered = filterHyperlinks(
      render(
        "aaa bbb ccc [the config file that is long](./config.json) and [x](https://e.com) and [y](file:///y)",
        { hyperlinks: true, color: true, width: 30 },
      ),
    );
    expect(rendered).toContain(`long${dim(" (./config.json)")}`);
    expect(rendered.split("(./config.json)")).toHaveLength(2);
    expect(countOpeners(rendered)).toBe(countClosers(rendered));
  });
});
