import { readFileSync } from "node:fs";
import { isExecutedAsMain } from "./lib/main.mjs";

export const PACKAGE_BUILD_INPUTS = [
  ".github/workflows",
  "api-surface",
  "packages",
  "scripts",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  "apps/docs/turbo.json",
  "examples/with-resumable-stream/turbo.json",
];

const touches = (file, input) => file === input || file.startsWith(`${input}/`);

const isExampleManifest = (file) =>
  /^examples\/[^/]+\/package\.json$/.test(file);

export function hasPackageBuildInputs(changedFiles) {
  return changedFiles.some(
    (file) =>
      isExampleManifest(file) ||
      PACKAGE_BUILD_INPUTS.some((input) => touches(file, input)),
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const changedFiles = readFileSync(0, "utf8")
    .split("\0")
    .filter((file) => file !== "");
  process.stdout.write(`${hasPackageBuildInputs(changedFiles)}\n`);
}
