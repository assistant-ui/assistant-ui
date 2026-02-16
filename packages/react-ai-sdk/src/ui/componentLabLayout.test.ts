import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));
const componentLabPagePath = resolve(
  currentDir,
  "../../../../examples/with-ai-sdk-v6/app/internal/component-lab/page.tsx",
);

describe("component lab layout constraints", () => {
  it("locks the workspace to viewport height and a single non-growing grid row", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).toContain('height: "100dvh"');
    expect(source).toContain('gridTemplateColumns: "minmax(0, 1fr) 20rem"');
    expect(source).toContain('gridTemplateRows: "minmax(0, 1fr)"');
  });

  it("keeps thread and controls in bounded scroll containers", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).toContain("h-full min-h-0 overflow-hidden");
    expect(source).toContain("h-full min-h-0 flex-col gap-4 overflow-y-auto");
  });
});
