import { describe, test } from "vitest";
import { escapeCurrencyDollars, normalizeMathDelimiters } from "./preprocess";

const createParagraph = (spans: number) => "a `b` ".repeat(spans);
const createParagraphs = (spans: number) =>
  Array.from({ length: spans / 50 }, () => createParagraph(50)).join("\n\n");

describe("preprocessing inline code spans", () => {
  for (const spans of [5000, 20000]) {
    for (const [layout, input] of [
      ["one paragraph", createParagraph(spans)],
      ["paragraph breaks every 50 spans", createParagraphs(spans)],
    ] as const) {
      test(`escapeCurrencyDollars: ${spans} spans, ${layout}`, async ({
        bench,
      }) => {
        await bench(`${spans} spans, ${layout}`, () =>
          escapeCurrencyDollars(input)).run({
          time: 100,
          iterations: 10,
          warmupTime: 50,
          warmupIterations: 2,
        });
      });

      test(`normalizeMathDelimiters: ${spans} spans, ${layout}`, async ({
        bench,
      }) => {
        await bench(`${spans} spans, ${layout}`, () =>
          normalizeMathDelimiters(input)).run({
          time: 100,
          iterations: 10,
          warmupTime: 50,
          warmupIterations: 2,
        });
      });
    }
  }
});
