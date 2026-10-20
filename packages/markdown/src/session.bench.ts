import { describe, test } from "vitest";
import { parseMarkdown } from "./parse";
import { createMarkdownSession } from "./session";

const sampling = {
  time: 100,
  iterations: 10,
  warmupTime: 50,
  warmupIterations: 2,
};

const section = [
  "## Progress update",
  "",
  "The **assistant** found a [reference](https://example.com) and checked `status`.",
  "",
  "- Gather the relevant files",
  "- Summarize the *next steps*",
  "",
  "```ts",
  "const ready = true;",
  "```",
  "",
  "| task | state |",
  "| :--- | ---: |",
  "| review | done |",
  "",
].join("\n");

describe("one 4-character append by message length", () => {
  for (const size of [1, 10, 40]) {
    const prefix = section.repeat(Math.ceil((size * 1024) / section.length));
    const endings = ["done", "next"] as const;

    test(`${size} KB session update`, async ({ bench }) => {
      // Each sample appends the next 4 characters of `growth`, and the session restarts from the prefix only when `growth` runs out, so resets stay rare.
      const growth = section.repeat(
        Math.ceil(prefix.length / 4 / section.length),
      );
      const steps = Math.floor(growth.length / 4);
      let session = createMarkdownSession();
      let step = steps;
      await bench(
        `${size} KB session update`,
        {
          beforeEach: () => {
            if (step < steps) return;
            session = createMarkdownSession();
            session.update(prefix);
            step = 0;
          },
        },
        () => {
          step += 1;
          session.update(prefix + growth.slice(0, step * 4));
        },
      ).run(sampling);
    });

    test(`${size} KB full parse`, async ({ bench }) => {
      let flip = 0;
      await bench(`${size} KB full parse`, () => {
        flip ^= 1;
        parseMarkdown(prefix + endings[flip]);
      }).run(sampling);
    });
  }
});
