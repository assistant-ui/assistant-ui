import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const APP_BUILD_INPUTS = [
  ".github/workflows/code-quality.yaml",
  "examples",
  "packages",
  "templates",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "scripts/app-build-inputs.mjs",
  "scripts/app-build-inputs.test.mjs",
  "turbo.json",
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const changedFiles = readFileSync(0, "utf8")
    .split("\0")
    .filter((file) => file !== "");
  process.stdout.write(`${hasAppBuildInputs(changedFiles)}\n`);
}
