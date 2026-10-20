import spec from "commonmark-spec";
import { expect, test } from "vitest";
import type { InlineNode, RootNode } from "./ast";
import { parseMarkdown } from "./parse";
import { createMarkdownSession } from "./session";

const streamed = (text: string) => createMarkdownSession().update(text);

const inlines = (root: RootNode): InlineNode[] => {
  const block = root.children.at(-1);
  if (block?.type !== "paragraph") throw new Error("Expected a paragraph");
  return block.children;
};

test.each<[string, InlineNode[]]>([
  [
    "Say **bold",
    [
      { type: "text", value: "Say " },
      { type: "strong", children: [{ type: "text", value: "bold" }] },
    ],
  ],
  [
    "Say *it",
    [
      { type: "text", value: "Say " },
      { type: "emphasis", children: [{ type: "text", value: "it" }] },
    ],
  ],
  [
    "***both",
    [
      {
        type: "strong",
        children: [
          { type: "emphasis", children: [{ type: "text", value: "both" }] },
        ],
      },
    ],
  ],
  [
    "~~gone",
    [{ type: "strikethrough", children: [{ type: "text", value: "gone" }] }],
  ],
  [
    "Run `npm i",
    [
      { type: "text", value: "Run " },
      { type: "codeSpan", value: "npm i" },
    ],
  ],
  [
    "**a *b",
    [
      {
        type: "strong",
        children: [
          { type: "text", value: "a " },
          { type: "emphasis", children: [{ type: "text", value: "b" }] },
        ],
      },
    ],
  ],
  [
    "**bold `code` more",
    [
      {
        type: "strong",
        children: [
          { type: "text", value: "bold " },
          { type: "codeSpan", value: "code" },
          { type: "text", value: " more" },
        ],
      },
    ],
  ],
  ["Hello **", [{ type: "text", value: "Hello " }]],
  ["See [docs](https://exa", [{ type: "text", value: "See docs" }]],
  ["See ![chart](https://exa", [{ type: "text", value: "See " }]],
])("%j renders closed while streaming", (source, expected) => {
  expect(inlines(streamed(source))).toEqual(expected);
});

test.each(["2 * 3", "snake_case_name", "See [1]", "**done**"])(
  "%j is left as parsed",
  (source) => {
    const session = createMarkdownSession();
    expect(session.update(source)).toBe(
      session.update(source, { final: true }),
    );
  },
);

test("the final update and a text ending in a blank line are not closed", () => {
  expect(
    inlines(createMarkdownSession().update("**bold", { final: true })),
  ).toEqual([{ type: "text", value: "**bold" }]);
  expect(inlines(streamed("**bold\n\n"))).toEqual([
    { type: "text", value: "**bold" },
  ]);
});

test("the end of a list item and a table cell is closed", () => {
  const list = streamed("- one\n- **two").children[0];
  expect(list?.type === "list" && list.children[1]?.children[0]).toEqual({
    type: "paragraph",
    lines: { start: 1, end: 2 },
    children: [{ type: "strong", children: [{ type: "text", value: "two" }] }],
  });
  const table = streamed("| a |\n| - |\n| **b |").children[0];
  expect(table?.type === "table" && table.children[1]?.children[0]).toEqual({
    type: "tableCell",
    children: [{ type: "strong", children: [{ type: "text", value: "b" }] }],
  });
});

test("closing projects the last block and keeps the parsed blocks for the next update", () => {
  const session = createMarkdownSession();
  const first = session.update("Intro.\n\nSay **bold\nand");
  const second = session.update("Intro.\n\nSay **bold\nand done** now");
  expect(second.children[0]).toBe(first.children[0]);
  expect(inlines(second)).toEqual([
    { type: "text", value: "Say " },
    {
      type: "strong",
      children: [
        { type: "text", value: "bold" },
        { type: "softBreak" },
        { type: "text", value: "and done" },
      ],
    },
    { type: "text", value: " now" },
  ]);
});

test("closing never throws while every CommonMark example streams, and the final update is canonical", () => {
  for (const example of spec.tests) {
    const source = example.markdown.replaceAll("→", "\t");
    const session = createMarkdownSession();
    for (let end = 1; end <= source.length; end++) {
      session.update(source.slice(0, end));
    }
    expect(session.update(source, { final: true })).toEqual(
      parseMarkdown(source),
    );
  }
});
