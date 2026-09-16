import { describe, test } from "vitest";
import remend from "remend";
import { findRemendWindowStart, tailBoundedRemend } from "../remend";

const PARAGRAPH_COUNTS = [732, 2926, 7315];
const CORPORA = PARAGRAPH_COUNTS.map(
  (count) => `${"20~25\n\n".repeat(count)}tail **b`,
);

const LIST_LINE_COUNTS = [1250, 5000, 12500];
const UNCLOSED_SPAN_CORPORA = LIST_LINE_COUNTS.map(
  (count) => `Press \` then:\n${"- x\n".repeat(count)}tail **b`,
);

describe("remend window scan on paragraph-dense messages", () => {
  for (const [index, text] of CORPORA.entries()) {
    const paragraphs = PARAGRAPH_COUNTS[index];
    test(`${paragraphs} paragraphs: window scan`, async ({ bench }) => {
      await bench(`${paragraphs} paragraphs: window scan`, () => {
        findRemendWindowStart(text);
      }).run();
    });
    test(`${paragraphs} paragraphs: tail-bounded remend`, async ({ bench }) => {
      await bench(`${paragraphs} paragraphs: tail-bounded remend`, () => {
        tailBoundedRemend(text);
      }).run();
    });
    test(`${paragraphs} paragraphs: full remend`, async ({ bench }) => {
      await bench(`${paragraphs} paragraphs: full remend`, () => {
        remend(text);
      }).run();
    });
  }
});

describe("remend window scan after an unclosed code span", () => {
  for (const [index, text] of UNCLOSED_SPAN_CORPORA.entries()) {
    const lines = LIST_LINE_COUNTS[index];
    test(`${lines} list lines: window scan`, async ({ bench }) => {
      await bench(`${lines} list lines: window scan`, () => {
        findRemendWindowStart(text);
      }).run();
    });
    test(`${lines} list lines: tail-bounded remend`, async ({ bench }) => {
      await bench(`${lines} list lines: tail-bounded remend`, () => {
        tailBoundedRemend(text);
      }).run();
    });
    test(`${lines} list lines: full remend`, async ({ bench }) => {
      await bench(`${lines} list lines: full remend`, () => {
        remend(text);
      }).run();
    });
  }
});
