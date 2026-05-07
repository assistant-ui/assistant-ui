import { build } from "esbuild";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outfile = join(__dirname, "..", ".dev", "index.mjs");

await build({
  entryPoints: [join(__dirname, "index.tsx")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  external: ["react", "react/*", "ink", "ink/*"],
  jsx: "automatic",
  jsxImportSource: "react",
  logLevel: "warning",
  ignoreAnnotations: true,
});

const child = spawn("node", [outfile], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
