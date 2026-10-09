import { readFileSync } from "node:fs";
import { isExecutedAsMain } from "./lib/main.mjs";

export const APP_BUILD_INPUTS = [
  ".github/workflows/code-quality.yaml",
  "apps/docs/content",
  "examples",
  "packages",
  "templates",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "scripts/app-build-inputs.mjs",
  "scripts/app-build-inputs.test.mjs",
  "turbo.json",
  "scripts/lib/script-options.mjs",
  "scripts/build-example-bundle.mjs",
  "scripts/package-example-bundles.mjs",
  "scripts/prepare-example-bundles.mjs",
  "scripts/run-example-bundles.mjs",
  "scripts/example-bundles.json",
  "scripts/example-bundles.test.mjs",
];

const touches = (file, input) => file === input || file.startsWith(`${input}/`);

const touchesBuiltApp = (file) =>
  file.startsWith("apps/") && !file.startsWith("apps/docs/");

export function hasAppBuildInputs(changedFiles) {
  return changedFiles.some(
    (file) =>
      touchesBuiltApp(file) ||
      APP_BUILD_INPUTS.some((input) => touches(file, input)),
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const changedFiles = readFileSync(0, "utf8")
    .split("\0")
    .filter((file) => file !== "");
  process.stdout.write(`${hasAppBuildInputs(changedFiles)}\n`);
}
