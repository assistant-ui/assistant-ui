import { describe, inject, test } from "vitest";
import {
  escapeCurrencyDollars,
  normalizeMathDelimiters,
} from "@assistant-ui/react-markdown/preprocess";

const message = [
  "The price moved from $5 to $7, so `delta` is `$2` and the ratio is $\\frac{7}{5}$.",
  "",
  "```ts\nconst total = items.reduce((sum, item) => sum + item.price, 0);\n```",
  "",
  "\\[\nE = mc^2\n\\]",
  "",
  "- a list item with `code` and \\(x^2\\)",
  "> a quote with `more code` and $$y$$",
  "",
]
  .join("\n")
  .repeat(100);

const inputs = [
  ["5,000 code spans in one paragraph", "a `b` ".repeat(5_000)],
  ["20,000 triple-backtick spans on one line", "a ```b``` ".repeat(20_000)],
  ["20,000 tilde runs on one line", "x ~~~ ".repeat(20_000)],
  ["mixed message, 100 sections", message],
] as const;

describe("react-markdown: preprocess", () => {
  for (const [label, input] of inputs) {
    for (const [helper, run] of [
      ["escapeCurrencyDollars", escapeCurrencyDollars],
      ["normalizeMathDelimiters", normalizeMathDelimiters],
    ] as const) {
      const name = `${helper}, ${label}`;
      test(name, async ({ bench }) => {
        await bench(name, () => {
          run(input);
        }).run(inject("benchSampling"));
      });
    }
  }
});
