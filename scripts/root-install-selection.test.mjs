import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = (name) =>
  readFileSync(
    new URL(`../.github/workflows/${name}`, import.meta.url),
    "utf8",
  );
const installStep = (file, job) => {
  const body = workflow(file).split(new RegExp(`^  ${job}:\\n`, "m"))[1];
  assert(body, `${file} has no ${job} job`);
  const step = body
    .split(/^  [a-z-]+:\n/m)[0]
    .split(/^      - /m)
    .find((step) => step.startsWith("name: Install dependencies\n"));
  assert(step, `${file} ${job} has no Install dependencies step`);
  return step;
};

// The root depends on a workspace package, so with `verifyDepsBeforeRun: install`
// a pnpm command after an install that left it out reinstalls the whole workspace.
for (const [file, job] of [
  ["code-quality.yaml", "build"],
  ["code-quality.yaml", "lint"],
  ["code-quality.yaml", "typecheck"],
  ["expo-native-bundle.yaml", "bundle"],
  ["perf.yaml", "measure"],
  ["perf-nightly.yaml", "measure"],
  ["template-metrics.yaml", "report"],
  ["vscode-test-bed.yaml", "probes"],
]) {
  test(`${file} ${job} installs the root with its workspace dependencies`, () => {
    const step = installStep(file, job);
    assert.match(step, /--filter[= ](["']?)\{\.\}\.\.\.\1(?=\s)/);
    assert.doesNotMatch(step, /--filter[= ](["']?)\.\1(?=\s)/);
  });
}
