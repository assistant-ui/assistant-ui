import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const API_REFERENCE_INPUTS = [
  "packages/react",
  "packages/core",
  "packages/store",
  "packages/tap",
  "packages/cloud",
  "packages/assistant-stream",
  "packages/generative-ui",
  "packages/react-generative-ui",
  "packages/ai-sdk",
  "packages/react-ai-sdk",
  "packages/react-data-stream",
  "packages/eve",
  "packages/safe-content-frame",
  "apps/docs/scripts",
  "apps/docs/content/types-to-generate",
  "apps/docs/content/docs/(reference)/api-reference",
  "apps/docs/package.json",
  "apps/docs/tsconfig.json",
  "scripts/api-reference-inputs.mjs",
  "scripts/lib/experimental-annotations.mjs",
  ".github/workflows/autofix.yaml",
  ".github/workflows/code-quality.yaml",
];

const touches = (file, input) => file === input || file.startsWith(`${input}/`);

export function hasApiReferenceInputs(changedFiles) {
  return changedFiles.some(
    (file) =>
      !/^packages\/[^/]+\/README\.md$/.test(file) &&
      API_REFERENCE_INPUTS.some((input) => touches(file, input)),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const changedFiles = readFileSync(0, "utf8")
    .split("\0")
    .filter((file) => file !== "");
  process.stdout.write(`${hasApiReferenceInputs(changedFiles)}\n`);
}
