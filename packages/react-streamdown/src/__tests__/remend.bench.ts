import { describe, test } from "vitest";
import remend from "remend";
import { findRemendWindowStart, tailBoundedRemend } from "../remend";

const PARAGRAPH_COUNTS = [732, 2926, 7315];
const CORPORA = PARAGRAPH_COUNTS.map(
  (count) => `${"20~25\n\n".repeat(count)}tail **b`,
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
