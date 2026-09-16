/// <reference types="node" />

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const xBuildutilsRequire = createRequire(
  resolve(here, "../../../../../x-buildutils/package.json"),
);
const { transformAsync } = xBuildutilsRequire(
  "@babel/core",
) as typeof import("@babel/core");
const reactCompilerPlugin = xBuildutilsRequire.resolve(
  "babel-plugin-react-compiler",
);
const markdownTextPath = resolve(here, "markdown-text.tsx");
const source = readFileSync(markdownTextPath, "utf8");

const compile = async (input: string) =>
  (
    await transformAsync(input, {
      filename: markdownTextPath,
      babelrc: false,
      configFile: false,
      parserOpts: { plugins: ["typescript", "jsx"] },
      plugins: [[reactCompilerPlugin, {}]],
    })
  )?.code ?? "";

const rendererConstructionGuard =
  /if \(\$\[\d+\] !== raw\) \{\s*t\d+ = new MarkdownRenderer\(raw\);\s*\$\[\d+\] = raw;\s*\$\[\d+\] = t\d+;\s*\} else \{\s*t\d+ = \$\[\d+\];\s*\}/;

it("guards the MarkdownBlock renderer construction on raw", async () => {
  expect(await compile(source)).toMatch(rendererConstructionGuard);
});
