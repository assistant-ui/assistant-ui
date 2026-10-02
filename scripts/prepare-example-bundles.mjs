import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = resolve(root, "apps/docs");
const { loadEnvConfig } = createRequire(resolve(docs, "package.json"))(
  "@next/env",
);
loadEnvConfig(docs, process.argv.includes("--dev"), {
  info() {},
  error: console.error,
});

if (process.env.NEXT_PUBLIC_AUI_EXAMPLE_BUNDLES_ENABLED !== "1") {
  await rm(resolve(root, "apps/docs/public/example-bundles"), {
    recursive: true,
    force: true,
  });
} else {
  for (const script of [
    "run-example-bundles.mjs",
    "package-example-bundles.mjs",
  ])
    execFileSync(process.execPath, [resolve(root, "scripts", script)], {
      cwd: root,
      stdio: "inherit",
    });
}
