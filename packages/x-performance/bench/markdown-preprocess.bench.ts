import { describe, inject, test } from "vitest";
import { escapeCurrencyDollars } from "@assistant-ui/react-markdown/preprocess";

const counts = [5_000, 10_000, 20_000];
const inputs = counts.map((count) => "x ```$5``` ".repeat(count));

describe("react-markdown: repeated triple-backtick code spans", () => {
  for (let index = 0; index < counts.length; index += 1) {
    const count = counts[index]!;
    const input = inputs[index]!;
    test(`${count} spans on one line`, async ({ bench }) => {
      await bench(`${count} spans`, () => escapeCurrencyDollars(input)).run(
        inject("benchSampling"),
      );
    });
  }
});
