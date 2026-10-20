import { expect, test } from "vitest";
import type { InlineNode } from "../ast";
import { parseMarkdown } from "../parse";
import { createMarkdownItTokenizer } from "./markdown-it";

const inline = (source: string): InlineNode[] => {
  const block = parseMarkdown(source).children[0];
  if (block?.type !== "paragraph") throw new Error("Expected a paragraph");
  return block.children;
};

test.each([
  ["$e^{i\\pi}$", "e^{i\\pi}", false],
  ["\\(a+b\\)", "a+b", false],
  ["\\[c\\]", "c", true],
  ["$$d$$", "d", true],
])("%s inside a line is inline math", (math, value, display) => {
  expect(inline(`Before ${math} after`)).toEqual([
    { type: "text", value: "Before " },
    { type: "mathInline", value, display },
    { type: "text", value: " after" },
  ]);
});

test.each(["costs $5 to $10", "range $5-$10", "a $ b $ c", "\\$5 and \\$6"])(
  "%s stays text",
  (source) => {
    expect(inline(source).every((node) => node.type === "text")).toBe(true);
  },
);

test("dollars inside a code span stay code", () => {
  expect(inline("`$x$`")).toEqual([{ type: "codeSpan", value: "$x$" }]);
});

test.each([
  ["$$\nx^2\n$$", "x^2", 3],
  ["$$x$$", "x", 1],
  ["\\[\n\\int f\n\\]", "\\int f", 3],
  ["$$\nstill streaming", "still streaming", 2],
])("%s is a math block", (source, value, end) => {
  expect(parseMarkdown(source).children).toEqual([
    { type: "mathBlock", value, lines: { start: 0, end } },
  ]);
});

test.each([
  ["$$\nx\n$$ and more", "x\n$$ and more"],
  ["$$\na $$b$$ c\n$$", "a $$b$$ c"],
  ["$$a\n\nb\n\nc$$", "a\n\nb\n\nc"],
])("only a line ending in the closer closes %j", (source, value) => {
  const [block] = parseMarkdown(source).children;
  expect(block?.type === "mathBlock" && block.value).toBe(value);
});

test("a line of unclosed openers parses as fast as plain text", () => {
  const openers = "$5 ".repeat(20_000);
  const plain = "a5 ".repeat(20_000);
  const fastest = (source: string) =>
    Math.min(
      ...Array.from({ length: 3 }, () => {
        const started = performance.now();
        parseMarkdown(source);
        return performance.now() - started;
      }),
    );
  expect(inline(openers)).toEqual([{ type: "text", value: openers.trimEnd() }]);
  expect(fastest(openers) / fastest(plain)).toBeLessThan(20);
});

test("a closer that ends a body line keeps the text before it", () => {
  expect(parseMarkdown("$$\na\nb $$\nafter").children).toEqual([
    { type: "mathBlock", value: "a\nb ", lines: { start: 0, end: 3 } },
    {
      type: "paragraph",
      lines: { start: 3, end: 4 },
      children: [{ type: "text", value: "after" }],
    },
  ]);
});

test("an escaped bracket that starts a line stays text", () => {
  expect(
    parseMarkdown("\\[x] done\n\nMore of the answer.").children.map(
      (node) => node.type,
    ),
  ).toEqual(["paragraph", "paragraph"]);
});

test("a math block interrupts a paragraph", () => {
  expect(
    parseMarkdown("Text\n$$\ny\n$$\nafter").children.map((node) => node.type),
  ).toEqual(["paragraph", "mathBlock", "paragraph"]);
});

test("math blocks nest in list items and blockquotes", () => {
  const [list] = parseMarkdown("- item\n\n  $$\n  z\n  $$").children;
  if (list?.type !== "list") throw new Error("Expected a list");
  expect(list.children[0]?.children[1]).toEqual({
    type: "mathBlock",
    value: "z",
    lines: { start: 2, end: 5 },
  });
  const [quote] = parseMarkdown("> $$\n> q\n> $$").children;
  if (quote?.type !== "blockquote") throw new Error("Expected a blockquote");
  expect(quote.children).toEqual([
    { type: "mathBlock", value: "q", lines: { start: 0, end: 3 } },
  ]);
});

test("CommonMark mode reads dollars and bracket escapes as text", () => {
  expect(
    createMarkdownItTokenizer({ extensions: false }).parse("$x$ \\(y\\)")
      .blocks,
  ).toEqual([
    {
      type: "paragraph",
      lines: { start: 0, end: 1 },
      children: [{ type: "text", value: "$x$ (y)" }],
    },
  ]);
});
