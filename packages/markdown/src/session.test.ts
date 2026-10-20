import spec from "commonmark-spec";
import { expect, test, vi } from "vitest";
import { parseMarkdown, markdownTokenizer } from "./parse";
import { createMarkdownSession, createSession } from "./session";

const stream = (source: string, chunks: Iterable<number>, label: string) => {
  const session = createMarkdownSession();
  let length = 0;
  let previous = session.update("");
  for (const size of chunks) {
    length = Math.min(length + size, source.length);
    const prefix = source.slice(0, length);
    const actual = session.update(prefix);
    const expected = parseMarkdown(prefix);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      expect(
        actual,
        `${label} at ${length}: ${JSON.stringify(prefix)}`,
      ).toEqual(expected);
    }
    const settled = previous.children.length - 2;
    expect(
      actual.children.findIndex(
        (child, index) => index < settled && child !== previous.children[index],
      ),
      `${label}: first replaced settled block at ${length}`,
    ).toBe(-1);
    previous = actual;
  }
  expect(length).toBe(source.length);
};

function* characters(length: number) {
  for (let index = 0; index < length; index++) yield 1;
}

function* seededChunks(length: number) {
  let seed = 0x12345678;
  let remaining = length;
  while (remaining > 0) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const size = Math.min((seed % 40) + 1, remaining);
    yield size;
    remaining -= size;
  }
}

const sections = [...new Set(spec.tests.map((example) => example.section))];

test.each(sections)(
  "CommonMark 0.31.2 %s examples converge on every character",
  (section) => {
    for (const example of spec.tests) {
      if (example.section !== section) continue;
      const source = example.markdown.replaceAll("→", "\t");
      stream(source, characters(source.length), `CommonMark ${example.number}`);
    }
  },
);

const gfmDocuments = [
  "| left | middle | right |\n| :--- | :---: | ---: |\n| a | **b** | `c` |\n",
  "- [ ] open\n- [x] done\n  - [X] nested\n",
  "Visit https://example.com and www.example.org or email me@example.org.\n",
  "- first\n  - nested\n\n- second\n\n  continuation\n",
  "# Code\n\n```ts\nconst answer = 42;\nconsole.log(answer);",
  "<div>\nraw <b>html</b>\n</div>\n\nAfter.\n",
  "A heading\n---------\n\nAfter.\n",
  "A *soft\nbreak* in emphasis.\n",
  "$$a\n\nb\n\nc$$\n",
  "$$a\n# h\nb$$\n",
  "\\[\nE = mc^2\n\\], where E is energy.\n\n## Next\n",
  "Euler $e^{i\\pi}+1=0$ and \\(a\\) cost $5 to $10.\n\n$$\nx^2\n$$\n\n- item\n\n  \\[\n  y\n  \\]\n",
];

test("GFM blocks and inlines converge on every character", () => {
  for (const [index, source] of gfmDocuments.entries()) {
    stream(source, characters(source.length), `GFM ${index}`);
  }
});

test("a mixed document over 5 KB converges in seeded 1 to 40 character chunks", () => {
  const section = [
    "# Streaming answer",
    "",
    "A paragraph with *emphasis*, [docs](https://example.com), and `inline code`.",
    "",
    "- first item",
    "- second item with **strong** text",
    "",
    "```ts",
    "const answer = 42;",
    "```",
    "",
    "| name | state |",
    "| :--- | ---: |",
    "| build | ready |",
    "",
    "> A quoted note.",
    "",
  ].join("\n");
  const source = section.repeat(Math.ceil(5_000 / section.length));
  expect(source.length).toBeGreaterThanOrEqual(5_000);
  stream(source, seededChunks(source.length), "mixed document");
});

test("append parsing starts on a line and stays within the last two paragraphs", () => {
  const paragraph = (index: number) =>
    `Paragraph ${String(index).padStart(2, "0")} has **bold** text and a [link](https://example.com).`;
  const text = Array.from({ length: 30 }, (_, index) => paragraph(index)).join(
    "\n\n",
  );
  const parse = vi.fn((source: string) => markdownTokenizer.parse(source));
  const session = createSession({ parse });
  let previousLength = 0;
  for (let length = 4; length < text.length + 4; length += 4) {
    const prefix = text.slice(0, length);
    session.update(prefix);
    const calls = parse.mock.calls;
    const tail = calls.at(-1)?.[0];
    expect(tail).toBeDefined();
    if (tail === undefined) throw new Error("Tokenizer was not called");
    if (previousLength > 0) {
      expect(prefix.endsWith(tail)).toBe(true);
      const start = prefix.length - tail.length;
      expect(start === 0 || prefix[start - 1] === "\n").toBe(true);
      expect(tail.length).toBeLessThanOrEqual(
        paragraph(0).length * 2 + 2 + (prefix.length - previousLength),
      );
    }
    previousLength = prefix.length;
  }
  expect(parse.mock.calls.length).toBe(Math.ceil(text.length / 4));

  const exact = vi.fn((source: string) => markdownTokenizer.parse(source));
  const short = createSession({ parse: exact });
  short.update("First.\n\nSecond.\n");
  short.update("First.\n\nSecond.\n\nThird.");
  expect(exact.mock.calls.map(([source]) => source)).toEqual([
    "First.\n\nSecond.\n",
    "Second.\n\nThird.",
  ]);
});

test.each([
  ["truncation", "First.\n\nSecond.\n", "First.\n"],
  ["mid-text edit", "First.\n\nSecond.\n", "Changed.\n\nSecond.\n"],
])("%s reparses the whole text", (_name, initial, next) => {
  const parse = vi.fn((source: string) => markdownTokenizer.parse(source));
  const session = createSession({ parse });
  session.update(initial);
  expect(session.update(next)).toEqual(parseMarkdown(next));
  expect(parse.mock.lastCall?.[0]).toBe(next);
});

test("a late reference definition reparses earlier links and keeps whole-text mode", () => {
  const parse = vi.fn((source: string) => markdownTokenizer.parse(source));
  const session = createSession({ parse });
  const before = "See [docs][d].\n\nMore.\n\n";
  const defined = `${before}[d]: https://example.com`;
  const unresolved = session.update(before);
  expect(unresolved.children[0]).toEqual({
    type: "paragraph",
    lines: { start: 0, end: 1 },
    children: [{ type: "text", value: "See [docs][d]." }],
  });
  const actual = session.update(defined);
  expect(actual).toEqual(parseMarkdown(defined));
  expect(actual.children[0]).toEqual({
    type: "paragraph",
    lines: { start: 0, end: 1 },
    children: [
      { type: "text", value: "See " },
      {
        type: "link",
        url: "https://example.com",
        children: [{ type: "text", value: "docs" }],
      },
      { type: "text", value: "." },
    ],
  });
  expect(parse.mock.calls.slice(-2).map(([source]) => source)).toEqual([
    "More.\n\n[d]: https://example.com",
    defined,
  ]);
  const later = `${defined}\n\nAfter.`;
  expect(session.update(later)).toEqual(parseMarkdown(later));
  expect(parse.mock.lastCall?.[0]).toBe(later);
});

test("an empty first update and later appends return whole-text-equivalent trees", () => {
  const parse = vi.fn((source: string) => markdownTokenizer.parse(source));
  const session = createSession({ parse });
  for (const text of ["", "A", "A\n", "A\n\nB"]) {
    expect(session.update(text)).toEqual(parseMarkdown(text));
  }
  expect(parse.mock.calls.map(([source]) => source)).toEqual([
    "",
    "A",
    "A\n",
    "A\n\nB",
  ]);
});

test("CRLF and CR normalize to LF, and an unchanged update keeps the root", () => {
  const source = "# Title\n\nFirst.\nSecond.\n";
  for (const newline of ["\r\n", "\r"]) {
    const session = createMarkdownSession();
    const input = source.replaceAll("\n", newline);
    const root = session.update(input);
    expect(root).toEqual(parseMarkdown(source));
    expect(session.update(input)).toBe(root);
    expect(session.update(source)).toBe(root);
  }
});
