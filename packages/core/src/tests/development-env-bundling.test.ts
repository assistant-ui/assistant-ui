import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { transform } from "esbuild";
import { describe, expect, it } from "vitest";

const warningGate =
  /\(\(\) => \{\s*try \{\s*return process\.env\.NODE_ENV !== "production";\s*\} catch \{\s*return false;\s*\}\s*\}\)\(\)/;
const tapGate =
  /\(\(\) => \{\s*try \{\s*return \(\s*process\.env\.NODE_ENV === "development" \|\| process\.env\.NODE_ENV === "test"\s*\);\s*\} catch \{\s*return false;\s*\}\s*\}\)\(\)/;

const guards = [
  {
    path: new URL(
      "../react/primitives/generativeUI/GenerativeUI.tsx",
      import.meta.url,
    ),
    pattern: warningGate,
  },
  {
    path: new URL(
      "../react/primitives/message/MessageParts.tsx",
      import.meta.url,
    ),
    pattern: warningGate,
  },
  {
    path: new URL("../../../tap/src/core/helpers/env.ts", import.meta.url),
    pattern: tapGate,
  },
];

const evaluateGuards = async (nodeEnv: string) => {
  const expressions = await Promise.all(
    guards.map(async ({ path, pattern }) => {
      const source = await readFile(path, "utf8");
      const expression = source.match(pattern)?.[0];
      if (expression === undefined) {
        throw new Error(`Development guard was not found in ${path.pathname}`);
      }
      return expression;
    }),
  );
  const { code } = await transform(`[${expressions.join(",")}]`, {
    define: { "process.env.NODE_ENV": JSON.stringify(nodeEnv) },
  });
  return JSON.parse(JSON.stringify(runInNewContext(code, {})));
};

describe.each([
  ["development", [true, true, true]],
  ["test", [true, true, true]],
  ["production", [false, false, false]],
] as const)("NODE_ENV=%s without a process global", (nodeEnv, expected) => {
  it("keeps core warnings and tap development checks aligned with the build mode", async () => {
    await expect(evaluateGuards(nodeEnv)).resolves.toEqual(expected);
  });
});
