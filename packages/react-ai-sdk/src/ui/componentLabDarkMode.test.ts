import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));
const componentLabPagePath = resolve(
  currentDir,
  "../../../../examples/with-ai-sdk-v6/app/internal/component-lab/page.tsx",
);

describe("component lab dark mode", () => {
  it("avoids hardcoded light surfaces and uses theme tokens", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).not.toContain("bg-white");
    expect(source).not.toContain("bg-slate-50");

    expect(source).toContain("bg-background");
    expect(source).toContain("bg-muted");
    expect(source).toContain("border-border");
    expect(source).toContain("text-foreground");
    expect(source).toContain("text-muted-foreground");
  });
});
