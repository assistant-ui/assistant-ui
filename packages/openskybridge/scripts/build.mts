import { Build } from "@assistant-ui/x-buildutils";
import * as esbuild from "esbuild";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// Build the OpenAI runtime as a self-contained IIFE
async function buildRuntime() {
  const result = await esbuild.build({
    entryPoints: ["src/runtimes/openai-runtime.ts"],
    bundle: true,
    minify: true,
    format: "iife",
    write: false,
    target: "es2020",
  });

  const code = result.outputFiles[0].text;
  const wrapped = `<script>${code}</script>`;

  // Write as a .ts file that exports the string
  const outputPath = "src/runtimes/openai-runtime-code.ts";
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `// Auto-generated - do not edit\nexport const OPENAI_RUNTIME_CODE = ${JSON.stringify(wrapped)};\n`
  );

  console.log("Built openai-runtime-code.ts");
}

await buildRuntime();
await Build.start().transpileTypescript();
