import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cases = [
  ["Base UI", "attachment.tsx"],
  ["Radix", "attachment.radix.tsx"],
].map(
  ([flavor, fileName]) =>
    [
      flavor,
      readFileSync(
        resolve(process.cwd(), `src/components/assistant-ui/${fileName}`),
        "utf8",
      ),
    ] as const,
);

describe("attachment preview dialog", () => {
  it.each(cases)(
    "%s keeps the non-element child fallback",
    (_flavor, source) => {
      expect(source).toContain(
        'isValidElement(children) ? children : <button type="button" />',
      );
    },
  );
});
