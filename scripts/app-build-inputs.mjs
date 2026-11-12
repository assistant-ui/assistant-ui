import { readFileSync } from "node:fs";
import { isExecutedAsMain } from "./lib/main.mjs";
import { isExcludedPackageTest } from "./lib/package-test-inputs.mjs";

const SHARED_BUILD_INPUTS = [
  ".github/workflows/code-quality.yaml",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "scripts/app-build-inputs.mjs",
  "scripts/app-build-inputs.test.mjs",
  "scripts/ci-has-tasks.mjs",
  "scripts/ci-has-tasks.test.mjs",
  "turbo.json",
  "scripts/lib",
];

export const APP_BUILD_INPUTS = [
  ...SHARED_BUILD_INPUTS,
  "apps/docs/content",
  "examples",
  "templates",
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

// Whether a package change reaches a built app depends on Turbo's graph, so the workflow asks Turbo's planner.
export function hasPackageInputs(changedFiles) {
  return changedFiles.some(
    (file) => !isExcludedPackageTest(file) && touches(file, "packages"),
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const changedFiles = readFileSync(0, "utf8")
    .split("\0")
    .filter((file) => file !== "");
  const detect = process.argv.includes("--packages")
    ? hasPackageInputs
    : hasAppBuildInputs;
  process.stdout.write(`${detect(changedFiles)}\n`);
}
