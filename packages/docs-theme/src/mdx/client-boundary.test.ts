import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const directive = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8").startsWith(
    '"use client"',
  );

it("renders headings and code blocks on the server, with only their copy buttons on the client", () => {
  expect(directive("./heading.tsx")).toBe(false);
  expect(directive("./code-block.tsx")).toBe(false);
  expect(directive("./copy-button.tsx")).toBe(true);
});
