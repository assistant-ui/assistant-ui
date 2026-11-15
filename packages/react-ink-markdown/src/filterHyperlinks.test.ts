import { describe, expect, it } from "vitest";
import { render } from "markdansi";
import {
  filterHyperlinks,
  hasRefusedHyperlink,
  hyperlinkTarget,
} from "./filterHyperlinks";

const open = (url: string) => `\u001b]8;;${url}\u0007`;
const close = "\u001b]8;;\u0007";

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

describe("hasRefusedHyperlink", () => {
  it("finds a refused link", () => {
    expect(
      hasRefusedHyperlink(
        `${open("https://ok.example")}a${close} ${open("./x")}b${close}`,
      ),
    ).toBe(true);
  });

  it("ignores allowed links and text without links", () => {
    expect(hasRefusedHyperlink(`${open("https://ok.example")}a${close}`)).toBe(
      false,
    );
    expect(hasRefusedHyperlink("plain")).toBe(false);
  });

  it("finds a refused link terminated by ST", () => {
    expect(hasRefusedHyperlink("\u001b]8;id=1;file:///x\u001b\\a")).toBe(true);
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

  it("accepts ST as the terminator and OSC 8 params", () => {
    expect(
      filterHyperlinks(
        "\u001b]8;id=1;file:///x\u001b\\one\u001b]8;;\u001b\\ \u001b]8;id=2;https://ok.example\u001b\\two\u001b]8;;\u001b\\",
      ),
    ).toBe(`one ${open("https://ok.example/")}two${close}`);
  });

  it("drops an unterminated opener and keeps the rest as text", () => {
    const output = filterHyperlinks(
      `${open("https://ok.example")}two${close} \u001b]8;;file:///x tail`,
    );
    expect(output).toBe(
      `${open("https://ok.example/")}two${close} file:///x tail`,
    );
  });

  it("closes a kept link that the output never closes", () => {
    expect(filterHyperlinks(`${open("https://ok.example")}two`)).toBe(
      `${open("https://ok.example/")}two${close}`,
    );
  });

  it("closes a kept link before a refused one starts", () => {
    expect(
      filterHyperlinks(`${open("https://ok.example")}a${open("file:///x")}b`),
    ).toBe(`${open("https://ok.example/")}a${close}b`);
  });

  it("leaves text without hyperlinks unchanged", () => {
    expect(filterHyperlinks("plain \u001b[1mbold\u001b[22m")).toBe(
      "plain \u001b[1mbold\u001b[22m",
    );
  });

  it("balances every opener in wrapped markdansi output", () => {
    const rendered = filterHyperlinks(
      render(
        "aaa bbb ccc [the config file that is long](https://e.com/a) and [y](file:///y)",
        { hyperlinks: true, color: true, width: 30 },
      ),
    );
    expect(rendered).not.toContain("\u001b]8;;file:");
    expect(countOpeners(rendered)).toBeGreaterThan(0);
    expect(countOpeners(rendered)).toBe(countClosers(rendered));
  });
});
