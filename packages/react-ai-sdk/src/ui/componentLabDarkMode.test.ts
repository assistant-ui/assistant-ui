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

  it("defines dark variants for colorized renderer states", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).toContain("dark:bg-red-950/40");
    expect(source).toContain("dark:border-emerald-800");
    expect(source).toContain("dark:border-cyan-800");
    expect(source).toContain("dark:border-violet-800");
    expect(source).toContain("dark:bg-amber-950/30");
    expect(source).toContain("dark:bg-rose-950/30");
  });

  it("keeps neutral badges legible in dark mode", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).toContain("bg-background/70");
    expect(source).toContain("text-foreground");
    expect(source).toContain("dark:bg-background/50");
  });
});
