import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  readFileSync(new URL(rel, import.meta.url), "utf8");

describe("landing page rating", () => {
  // The landing pane wraps lines to fit; the code is the same.
  it("shows the component the Result builds", () => {
    const page = read("../../../../../app/(demos)/remote-components/page.tsx");
    const shown = /const STEP_COMPONENT = `([^`]*)`;/.exec(page)?.[1];
    const squash = (s: string | undefined) => s?.replace(/[\s,]+/g, "");
    expect(squash(shown)).toBe(squash(read("./rating.tsx")));
  });
});
