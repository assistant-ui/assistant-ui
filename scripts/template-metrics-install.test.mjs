import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/template-metrics.yaml", import.meta.url),
  "utf8",
);
const install = workflow
  .match(
    /      - name: Install dependencies\n        run: \|\n([\s\S]*?)(?=\n      - name:)/,
  )[1]
  .replace(/^          /gm, "");

const installArgs = (templates) => {
  const result = spawnSync("bash", [], {
    input: `pnpm() { printf '%s\\n' "$@"; }\n${install}`,
    env: { ...process.env, BUNDLE_TEMPLATES: templates },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim().split("\n");
};

test("installs each measured template's dependency graph and aliased UI sources", () => {
  const templates = workflow.match(/BUNDLE_TEMPLATES: "([^"]+)"/)[1];
  assert.deepEqual(installArgs(templates), [
    "install",
    "--frozen-lockfile",
    "--filter=.",
    "--filter=@assistant-ui/ui...",
    "--filter=@assistant-ui/react-devtools...",
    ...templates
      .split(/\s+/)
      .map((name) => `--filter={./templates/${name}}...`),
  ]);
});

test("install selection follows BUNDLE_TEMPLATES without a second hardcoded list", () => {
  const args = installArgs("minimal future-template");
  assert.ok(args.includes("--filter={./templates/minimal}..."));
  assert.ok(args.includes("--filter={./templates/future-template}..."));
  assert.ok(!args.some((arg) => arg.includes("/default")));
});

test("the selection contract runs in the workflow and triggers its own changes", () => {
  assert.match(workflow, /- "scripts\/template-metrics-install\.test\.mjs"/);
  assert.match(
    workflow,
    /run: node --test scripts\/template-metrics-install\.test\.mjs/,
  );
  assert.match(workflow, /cache: false/);
});
