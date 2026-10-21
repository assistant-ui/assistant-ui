import { describe, expect, test } from "vitest";
import { parseMarkdown } from "./parse";
import { createMarkdownSession } from "./session";

const inlineOf = (text: string) => {
  const block = parseMarkdown(text).children[0];
  if (block?.type !== "paragraph") throw new Error(`no paragraph in ${text}`);
  return block.children;
};

describe("link destinations", () => {
  test.each([
    ["[a](https://example.com/path?q=1)", "https://example.com/path?q=1"],
    ["[a](http://example.com)", "http://example.com"],
    ["[a](/docs/start)", "/docs/start"],
    ["[a](#heading)", "#heading"],
    ["[a](mailto:team@example.com)", "mailto:team@example.com"],
    ["<https://example.com>", "https://example.com"],
    ["www.example.com", "http://www.example.com"],
    ["[a](data:image/png;base64,AAAA)", "data:image/png;base64,AAAA"],
  ])("keeps %s", (text, url) => {
    expect(inlineOf(text)).toEqual([
      expect.objectContaining({ type: "link", url }),
    ]);
  });

  test.each([
    ["[a](javascript:alert(1))", "[a](javascript:alert(1))"],
    ["[a](JaVaScRiPt:alert(1))", "[a](JaVaScRiPt:alert(1))"],
    ["[a](&#106;avascript:alert(1))", "[a](javascript:alert(1))"],
    ["[a](vbscript:msgbox(1))", "[a](vbscript:msgbox(1))"],
    ["[a](file:///etc/passwd)", "[a](file:///etc/passwd)"],
    ["[a](data:text/html,x)", "[a](data:text/html,x)"],
    ["<javascript:alert(1)>", "<javascript:alert(1)>"],
  ])("leaves %s as text", (text, value) => {
    expect(inlineOf(text)).toEqual([{ type: "text", value }]);
  });

  test("a definition with an unsafe destination defines nothing", () => {
    const root = parseMarkdown("[a][x]\n\n[x]: javascript:alert(1)");
    expect(JSON.stringify(root)).not.toContain('"type":"link"');
  });
});

describe("image sources", () => {
  test.each(["gif", "png", "jpeg", "webp"])(
    "keeps a data:image/%s source",
    (format) => {
      const url = `data:image/${format};base64,AAAA`;
      expect(inlineOf(`![i](${url})`)).toEqual([
        { type: "image", url, alt: "i" },
      ]);
    },
  );

  test.each([
    "![i](javascript:alert(1))",
    "![i](data:image/svg+xml;base64,AAAA)",
    "![i](data:text/html,x)",
  ])("leaves %s as text", (text) => {
    expect(inlineOf(text)).toEqual([{ type: "text", value: text }]);
  });
});

describe("raw HTML", () => {
  test("inline HTML stays verbatim in its own nodes", () => {
    expect(inlineOf('<a href="javascript:x">t</a> <script>y</script>')).toEqual(
      [
        { type: "htmlInline", value: '<a href="javascript:x">' },
        { type: "text", value: "t" },
        { type: "htmlInline", value: "</a>" },
        { type: "text", value: " " },
        { type: "htmlInline", value: "<script>" },
        { type: "text", value: "y" },
        { type: "htmlInline", value: "</script>" },
      ],
    );
  });

  test("an HTML block stays verbatim in one node", () => {
    expect(
      parseMarkdown('<div onclick="x()">\nblock\n</div>').children,
    ).toEqual([
      {
        type: "htmlBlock",
        value: '<div onclick="x()">\nblock\n</div>',
        lines: { start: 0, end: 3 },
      },
    ]);
  });
});

describe("a streaming link with an unfinished destination", () => {
  test("shows its label", () => {
    const root = createMarkdownSession().update("[a](javascript:al");
    expect(root.children[0]).toMatchObject({
      type: "paragraph",
      children: [{ type: "text", value: "a" }],
    });
  });

  test("carries no url once the destination holds a parenthesis", () => {
    const root = createMarkdownSession().update("[a](javascript:alert(1)");
    expect(JSON.stringify(root)).not.toContain('"url"');
  });
});
