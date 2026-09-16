import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { deterministicOutput } = await jiti.import(
  "../src/deterministic-output.ts",
  { default: false },
);
const plugin = deterministicOutput();

async function normalize(code, fileName, facadeModuleId = null) {
  const result = await plugin.renderChunk(code, {
    fileName,
    facadeModuleId,
  });
  return result?.code ?? code;
}

test("sorts relative imports without reprinting the chunk", async () => {
  const output = await normalize(
    'import { b } from "./b.js";\nimport { a } from "./a.js";\nimport { external } from "external";\n',
    "index.js",
  );

  assert.equal(
    output,
    'import { a } from "./a.js";\nimport { b } from "./b.js";\nimport { external } from "external";\n',
  );
});

test("sorts inferred type-reference members", async () => {
  const output = await normalize(
    [
      "declare const values: z.ZodEnum<{",
      '  secondary: "secondary";',
      '  danger: "danger";',
      '  primary: "primary";',
      "}>;",
    ].join("\n"),
    "values.d.ts",
  );

  assert.ok(
    output.indexOf('danger: "danger";') < output.indexOf('primary: "primary";'),
  );
  assert.ok(
    output.indexOf('primary: "primary";') <
      output.indexOf('secondary: "secondary";'),
  );
});

test("does not sort other type-reference members", async () => {
  const input = [
    "declare const values: z.ZodObject<{",
    "  secondary: z.ZodString;",
    "  danger: z.ZodString;",
    "}>;",
  ].join("\n");

  assert.equal(await normalize(input, "values.d.ts"), input);
});

test("removes generated declaration side-effect imports", async () => {
  const output = await normalize(
    [
      'import { AssistantRuntime } from "../../runtime/api/assistant-runtime.js";',
      'import "../../index.js";',
      'import { AssistantCloud } from "assistant-cloud";',
    ].join("\n"),
    "useLocalRuntime.d.ts",
    new URL(
      "../../core/src/react/runtimes/useLocalRuntime.d.ts",
      import.meta.url,
    ).pathname,
  );

  assert.equal(output.includes('import "../../index.js";'), false);
  assert.match(output, /assistant-runtime\.js";\nimport \{ AssistantCloud/);
});

test("preserves source declaration side-effect imports", async () => {
  const output = await normalize(
    'import "./mcp-scope.js";\n',
    "index.d.ts",
    new URL("../../react-mcp/src/index.d.ts", import.meta.url).pathname,
  );

  assert.equal(output, 'import "./mcp-scope.js";\n');
});
