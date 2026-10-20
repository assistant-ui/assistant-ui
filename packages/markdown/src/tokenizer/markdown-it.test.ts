import { expect, test } from "vitest";
import { parseMarkdown } from "../parse";
import { createMarkdownItTokenizer } from "./markdown-it";

test("tables preserve alignment, header order, cell children, and row lines", () => {
  expect(
    parseMarkdown(
      "| left | center | right | plain |\n| :--- | :---: | ---: | --- |\n| *a* | b | c | d |\n",
    ).children[0],
  ).toEqual({
    type: "table",
    align: ["left", "center", "right", null],
    lines: { start: 0, end: 3 },
    children: [
      {
        type: "tableRow",
        lines: { start: 0, end: 1 },
        children: ["left", "center", "right", "plain"].map((value) => ({
          type: "tableCell",
          children: [{ type: "text", value }],
        })),
      },
      {
        type: "tableRow",
        lines: { start: 2, end: 3 },
        children: [
          {
            type: "tableCell",
            children: [
              { type: "emphasis", children: [{ type: "text", value: "a" }] },
            ],
          },
          ...["b", "c", "d"].map((value) => ({
            type: "tableCell",
            children: [{ type: "text", value }],
          })),
        ],
      },
    ],
  });
});

test("double tildes produce strikethrough inline children", () => {
  expect(parseMarkdown("before ~~x~~ after").children[0]).toEqual({
    type: "paragraph",
    lines: { start: 0, end: 1 },
    children: [
      { type: "text", value: "before " },
      { type: "strikethrough", children: [{ type: "text", value: "x" }] },
      { type: "text", value: " after" },
    ],
  });
});

test("space, lowercase x, and uppercase X task markers set checked and leave the paragraph text", () => {
  expect(
    parseMarkdown("- [ ] open\n- [x] done\n- [X] done\n").children[0],
  ).toEqual({
    type: "list",
    ordered: false,
    tight: true,
    lines: { start: 0, end: 3 },
    children: [
      {
        type: "listItem",
        checked: false,
        lines: { start: 0, end: 1 },
        children: [
          {
            type: "paragraph",
            lines: { start: 0, end: 1 },
            children: [{ type: "text", value: "open" }],
          },
        ],
      },
      {
        type: "listItem",
        checked: true,
        lines: { start: 1, end: 2 },
        children: [
          {
            type: "paragraph",
            lines: { start: 1, end: 2 },
            children: [{ type: "text", value: "done" }],
          },
        ],
      },
      {
        type: "listItem",
        checked: true,
        lines: { start: 2, end: 3 },
        children: [
          {
            type: "paragraph",
            lines: { start: 2, end: 3 },
            children: [{ type: "text", value: "done" }],
          },
        ],
      },
    ],
  });
});

test("task marker followed by a tab is removed", () => {
  expect(parseMarkdown("- [x]\tdone\n").children[0]).toEqual({
    type: "list",
    ordered: false,
    tight: true,
    lines: { start: 0, end: 1 },
    children: [
      {
        type: "listItem",
        checked: true,
        lines: { start: 0, end: 1 },
        children: [
          {
            type: "paragraph",
            lines: { start: 0, end: 1 },
            children: [{ type: "text", value: "done" }],
          },
        ],
      },
    ],
  });
});

test("task markers without following whitespace or at a later position stay text", () => {
  expect(parseMarkdown("- [x]done\n- prefix [x] done\n").children[0]).toEqual({
    type: "list",
    ordered: false,
    tight: true,
    lines: { start: 0, end: 2 },
    children: [
      {
        type: "listItem",
        lines: { start: 0, end: 1 },
        children: [
          {
            type: "paragraph",
            lines: { start: 0, end: 1 },
            children: [{ type: "text", value: "[x]done" }],
          },
        ],
      },
      {
        type: "listItem",
        lines: { start: 1, end: 2 },
        children: [
          {
            type: "paragraph",
            lines: { start: 1, end: 2 },
            children: [{ type: "text", value: "prefix [x] done" }],
          },
        ],
      },
    ],
  });
});

test("a marker alone on its line starts the item text on the next line", () => {
  expect(parseMarkdown("- [x]\n  next\n- [ ]**bold**\n").children[0]).toEqual({
    type: "list",
    ordered: false,
    tight: true,
    lines: { start: 0, end: 3 },
    children: [
      {
        type: "listItem",
        checked: true,
        lines: { start: 0, end: 2 },
        children: [
          {
            type: "paragraph",
            lines: { start: 0, end: 2 },
            children: [{ type: "text", value: "next" }],
          },
        ],
      },
      {
        type: "listItem",
        lines: { start: 2, end: 3 },
        children: [
          {
            type: "paragraph",
            lines: { start: 2, end: 3 },
            children: [
              { type: "text", value: "[ ]" },
              { type: "strong", children: [{ type: "text", value: "bold" }] },
            ],
          },
        ],
      },
    ],
  });
});

test("a task item containing only its marker has no empty text node", () => {
  expect(parseMarkdown("- [x] \n").children[0]).toEqual({
    type: "list",
    ordered: false,
    tight: true,
    lines: { start: 0, end: 1 },
    children: [
      {
        type: "listItem",
        checked: true,
        lines: { start: 0, end: 1 },
        children: [
          { type: "paragraph", lines: { start: 0, end: 1 }, children: [] },
        ],
      },
    ],
  });
});

test("scheme, www, and email autolinks become links, while a bare domain merges into text", () => {
  expect(
    parseMarkdown(
      "https://example.org www.example.org me@example.org hello example.com world",
    ).children[0],
  ).toEqual({
    type: "paragraph",
    lines: { start: 0, end: 1 },
    children: [
      {
        type: "link",
        url: "https://example.org",
        children: [{ type: "text", value: "https://example.org" }],
      },
      { type: "text", value: " " },
      {
        type: "link",
        url: "http://www.example.org",
        children: [{ type: "text", value: "www.example.org" }],
      },
      { type: "text", value: " " },
      {
        type: "link",
        url: "mailto:me@example.org",
        children: [{ type: "text", value: "me@example.org" }],
      },
      { type: "text", value: " hello example.com world" },
    ],
  });
});

test("unsafe javascript destinations never produce a link", () => {
  expect(parseMarkdown("[x](javascript:alert(1))").children[0]).toEqual({
    type: "paragraph",
    lines: { start: 0, end: 1 },
    children: [{ type: "text", value: "[x](javascript:alert(1))" }],
  });
});

test("block and list item lines use zero-based end-exclusive source ranges", () => {
  const blocks = parseMarkdown(
    "one\n\n# two\n\n~~~js\nx\n~~~\n\n- a\n- b\n\n> q\n\n| h |\n| - |\n| v |\n",
  ).children;
  expect(
    blocks.map((node) => ({ type: node.type, lines: node.lines })),
  ).toEqual([
    { type: "paragraph", lines: { start: 0, end: 1 } },
    { type: "heading", lines: { start: 2, end: 3 } },
    { type: "codeBlock", lines: { start: 4, end: 7 } },
    { type: "list", lines: { start: 8, end: 11 } },
    { type: "blockquote", lines: { start: 11, end: 12 } },
    { type: "table", lines: { start: 13, end: 16 } },
  ]);
  const list = blocks[3];
  if (list?.type !== "list") throw new Error("Expected a list");
  expect(list.children.map((item) => item.lines)).toEqual([
    { start: 8, end: 9 },
    { start: 9, end: 11 },
  ]);
});

test("fence info splits into lang and meta, while empty info and indented code omit both", () => {
  expect(
    parseMarkdown("~~~ts extra words\nx\n~~~\n\n~~~\ny\n~~~\n\n    z\n")
      .children,
  ).toEqual([
    {
      type: "codeBlock",
      lang: "ts",
      meta: "extra words",
      value: "x\n",
      lines: { start: 0, end: 3 },
    },
    { type: "codeBlock", value: "y\n", lines: { start: 4, end: 7 } },
    { type: "codeBlock", value: "z\n", lines: { start: 8, end: 9 } },
  ]);
});

test("ordered lists keep their start and tight lists expose tight paragraphs", () => {
  expect(parseMarkdown("3. one\n4. two\n").children[0]).toEqual({
    type: "list",
    ordered: true,
    start: 3,
    tight: true,
    lines: { start: 0, end: 2 },
    children: [
      {
        type: "listItem",
        lines: { start: 0, end: 1 },
        children: [
          {
            type: "paragraph",
            lines: { start: 0, end: 1 },
            children: [{ type: "text", value: "one" }],
          },
        ],
      },
      {
        type: "listItem",
        lines: { start: 1, end: 2 },
        children: [
          {
            type: "paragraph",
            lines: { start: 1, end: 2 },
            children: [{ type: "text", value: "two" }],
          },
        ],
      },
    ],
  });
  const loose = parseMarkdown("- one\n\n- two\n").children[0];
  if (loose?.type !== "list") throw new Error("Expected a list");
  expect(loose.tight).toBe(false);
});

test("raw block and inline HTML keep their source value", () => {
  expect(
    parseMarkdown("<div>\nraw\n</div>\n\ntext <b>x</b>\n").children,
  ).toEqual([
    {
      type: "htmlBlock",
      value: "<div>\nraw\n</div>\n",
      lines: { start: 0, end: 3 },
    },
    {
      type: "paragraph",
      lines: { start: 4, end: 5 },
      children: [
        { type: "text", value: "text " },
        { type: "htmlInline", value: "<b>" },
        { type: "text", value: "x" },
        { type: "htmlInline", value: "</b>" },
      ],
    },
  ]);
});

test("CommonMark mode leaves pipe tables and double tildes as paragraph text", () => {
  expect(
    createMarkdownItTokenizer({ gfm: false }).parse(
      "| a | b |\n| - | - |\n| x | y |\n\n~~x~~\n",
    ),
  ).toEqual([
    {
      type: "paragraph",
      lines: { start: 0, end: 3 },
      children: [
        { type: "text", value: "| a | b |" },
        { type: "softBreak" },
        { type: "text", value: "| - | - |" },
        { type: "softBreak" },
        { type: "text", value: "| x | y |" },
      ],
    },
    {
      type: "paragraph",
      lines: { start: 4, end: 5 },
      children: [{ type: "text", value: "~~x~~" }],
    },
  ]);
});
