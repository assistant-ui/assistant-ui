import spec from "commonmark-spec";
import { test, expect } from "vitest";
import { toHtml } from "../__tests__/toHtml";
import { createMarkdownItTokenizer } from "./markdown-it";

const tokenizer = createMarkdownItTokenizer({ extensions: false });
const knownDeviations = new Set([218, 239, 240]);

for (const example of spec.tests) {
  const check = knownDeviations.has(example.number) ? test.fails : test;
  check(`${example.number} ${example.section}`, () => {
    const source = example.markdown.replaceAll("→", "\t");
    const expected = example.html.replaceAll("→", "\t");
    expect(toHtml(tokenizer.parse(source).blocks)).toBe(expected);
  });
}
