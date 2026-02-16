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
  it("overrides light utility surfaces in dark mode", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).toContain("dark:[&_.bg-white]:bg-slate-900");
    expect(source).toContain("dark:[&_.bg-slate-50]:bg-slate-800");
    expect(source).toContain("dark:[&_.border-slate-300]:border-slate-600");
    expect(source).toContain("dark:[&_.text-slate-700]:text-slate-200");
  });
});
