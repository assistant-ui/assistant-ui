import { readFileSync } from "node:fs";
import path from "node:path";
import { globSync } from "fast-glob";
import { expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

it("keeps current examples off the configured useAui overload", () => {
  const files = globSync(
    [
      "apps/docs/{runtimes,components}/**/*.tsx",
      "apps/docs/lib/xulux/learn/**/*.tsx",
      "packages/store/src/Derived.ts",
      "packages/react-mcp/src/index.ts",
      "packages/ui/src/components/react/assistant-ui/elements/mcp-config.aui*.tsx",
      "packages/cli/plugin/skills/assistant-ui/SKILL.md",
    ],
    { cwd: ROOT, ignore: ["**/*.test.*"] },
  );
  const deprecated = files.filter((file) =>
    /\buseAui\s*\(\s*\{/.test(readFileSync(path.join(ROOT, file), "utf8")),
  );

  expect(deprecated).toEqual([]);
});
