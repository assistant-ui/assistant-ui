/// <reference types="node" />

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { expect, it } from "vitest";

const xBuildutilsRequire = createRequire(
  resolve(process.cwd(), "../x-buildutils/package.json"),
);
const { transformAsync } = xBuildutilsRequire(
  "@babel/core",
) as typeof import("@babel/core");
const reactCompilerPlugin = xBuildutilsRequire.resolve(
  "babel-plugin-react-compiler",
);
const markdownTextPath = resolve(
  process.cwd(),
  "src/components/react-native/assistant-ui/elements/markdown-text.tsx",
);
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

const expectRendererConstructionToBeGuarded = (output: string) => {
  expect(output).toMatch(rendererConstructionGuard);
};

it("guards the MarkdownBlock renderer construction on raw", async () => {
  expectRendererConstructionToBeGuarded(await compile(source));
});

it("rejects lowered output where the renderer construction is unguarded", async () => {
  const output = await compile(source);
  const unguardedOutput = output.replace(
    rendererConstructionGuard,
    "const renderer = new MarkdownRenderer(raw);",
  );

  expect(unguardedOutput).not.toBe(output);
  expect(() =>
    expectRendererConstructionToBeGuarded(unguardedOutput),
  ).toThrow();
});
